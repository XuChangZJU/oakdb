"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQL = void 0;
const Driver_1 = require("./Driver");
const Txn_1 = require("../types/Txn");
const MySQLTranslator_1 = require("../translator/MySQLTranslator");
const assert_1 = __importDefault(require("assert"));
const uuid_1 = require("uuid");
const lodash_1 = require("lodash");
const errorCode_1 = require("../errorCode");
function convertGeoTextToObject(geoText) {
    if (geoText.startsWith('POINT')) {
        const coord = geoText.match((/\d+(?=\)|\s)/g));
        return {
            type: 'Point',
            coordinates: coord.map(ele => parseFloat(ele)),
        };
    }
    else {
        throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.unsupportedYet, 'only support Point now');
    }
}
class MySQL extends Driver_1.Driver {
    constructor(options, schema, log) {
        super(options, schema, log);
        this.debug = false;
        const { database } = options;
        this.database = database;
        this.mysql = require('mysql');
        this.addForeignKeyColumns(this.schema);
        this.translator = new MySQLTranslator_1.MySQLTranslator(this.schema);
        this.transactions = {};
    }
    getPrimaryKeyType() {
        return 'bigint';
    }
    /**
     * 为所有的ref类型创建`${ref}Id`列，并创建外键的索引
     */
    addForeignKeyColumns(schema) {
    }
    async connect() {
        this.connectionPool = await this.mysql.createPool(this.options);
    }
    async disconnect() {
        await this.connectionPool.end();
    }
    unfoldResult(entity, result) {
        const { schema } = this;
        function resolveAttribute(entity2, r, attr, value) {
            const { attributes } = schema[entity2];
            const i = attr.indexOf(".");
            if (i !== -1) {
                const attrHead = attr.slice(0, i);
                const attrTail = attr.slice(i + 1);
                if (!r[attrHead]) {
                    r[attrHead] = {};
                }
                assert_1.default(attributes[attrHead] && attributes[attrHead].type === 'ref');
                resolveAttribute(attributes[attrHead].ref, r[attrHead], attrTail, value);
            }
            else if (attributes[attr]) {
                const { type } = attributes[attr];
                switch (type) {
                    case 'date':
                    case 'time': {
                        if (value instanceof Date) {
                            r[attr] = value.valueOf();
                        }
                        else {
                            r[attr] = value;
                        }
                        break;
                    }
                    case 'geometry': {
                        if (typeof value === 'string') {
                            r[attr] = convertGeoTextToObject(value);
                        }
                        else {
                            r[attr] = value;
                        }
                        break;
                    }
                    case 'object': {
                        if (typeof value === 'string') {
                            r[attr] = JSON.parse(value);
                        }
                        else {
                            r[attr] = value;
                        }
                        break;
                    }
                    case 'function': {
                        if (typeof value === 'string') {
                            r[attr] = new Function(` return ${value}`)();
                        }
                        else {
                            r[attr] = value;
                        }
                        break;
                    }
                    default: {
                        r[attr] = value;
                    }
                }
            }
            else {
                r[attr] = value;
            }
        }
        function formalizeNullObject(r) {
            let allowFormalize = true;
            for (let attr in r) {
                if (typeof r[attr] === 'object') {
                    if (formalizeNullObject(r[attr])) {
                        r[attr] = null;
                    }
                    else {
                        allowFormalize = false;
                    }
                }
                else if (r[attr] !== null) {
                    allowFormalize = false;
                }
            }
            return allowFormalize;
        }
        function unfoldRow(r) {
            let result2 = {};
            for (let attr in r) {
                const value = r[attr];
                resolveAttribute(entity, result2, attr, value);
            }
            formalizeNullObject(result2);
            return result2;
        }
        if (result instanceof Array) {
            return result.map(r => unfoldRow(r));
        }
        return unfoldRow(result);
    }
    translateToOakError(err) {
        const code = MySQL.ERR_DICT[err.errno];
        if (code) {
            return errorCode_1.ErrorCode.createError(code, err.sqlMessage);
        }
        return errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.databaseError, err.sqlMessage);
    }
    async exec(sql, txn) {
        const { NODE_ENV } = process.env;
        if (NODE_ENV && NODE_ENV.toLowerCase() === 'dev') {
            this.log(sql);
        }
        let result;
        if (txn) {
            const { data: connection } = txn;
            result = await new Promise((resolve, reject) => {
                connection.query(sql, (err, result, fields) => {
                    if (err) {
                        this.log(`sql exec err: ${sql}`);
                        return reject(this.translateToOakError(err));
                    }
                    return resolve(result);
                });
            });
        }
        else {
            result = await new Promise((resolve, reject) => {
                // if (process.env.DEBUG) {
                //  console.log(sql);
                //}
                this.connectionPool.query(sql, (err, result, fields) => {
                    if (err) {
                        ;
                        return reject(this.translateToOakError(err));
                    }
                    return resolve(result);
                });
            });
        }
        return result;
    }
    async init(replace, excludes) {
        const entities = Object.keys(this.schema);
        for (let entity of entities) {
            if (excludes && excludes.includes(entity)) {
                continue;
            }
            const sql = this.translator.translateCreateEntity(entity, { replace });
            await (this.exec(sql));
        }
        return;
    }
    async destroy(truncate, excludes) {
        const entities = Object.keys(this.schema);
        for (let entity of entities) {
            if (excludes && excludes.includes(entity)) {
                continue;
            }
            const sql = this.translator.translateDestroyEntity(entity, truncate);
            await (this.exec(sql));
        }
        return;
    }
    async startTransaction(option) {
        return await new Promise((resolve, reject) => {
            this.connectionPool.getConnection((err, connection) => {
                if (err) {
                    return reject(err);
                }
                const { readonly, isolationLevel } = option || {};
                const startTxn = () => {
                    let sql = 'START TRANSACTION';
                    if (readonly) {
                        sql += ' READ ONLY;';
                    }
                    else {
                        sql += ';';
                    }
                    connection.query(sql, (err2) => {
                        if (err2) {
                            return reject(err2);
                        }
                        const id = uuid_1.v4();
                        const txn = new Txn_1.Txn(id, connection);
                        lodash_1.assign(this.transactions, {
                            [id]: txn,
                        });
                        resolve(txn);
                    });
                };
                if (isolationLevel) {
                    connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel};`, (err2) => {
                        if (err2) {
                            return reject(err2);
                        }
                        startTxn();
                    });
                }
                else {
                    startTxn();
                }
            });
        });
    }
    async commitTransaction(txn) {
        const { data: connection } = txn;
        return await new Promise((resolve, reject) => {
            connection.query('COMMIT;', (err) => {
                if (err) {
                    return reject(err);
                }
                connection.release();
                lodash_1.unset(this.transactions, txn.id);
                txn.emit('committed');
                resolve();
            });
        });
    }
    async rollbackTransaction(txn) {
        const { data: connection } = txn;
        return await new Promise((resolve, reject) => {
            connection.query('ROLLBACK;', (err) => {
                if (err) {
                    return reject(err);
                }
                connection.release();
                lodash_1.unset(this.transactions, txn.id);
                txn.emit('rollbacked');
                resolve();
            });
        });
    }
    getTransactionById(id) {
        return this.transactions[id];
    }
    async create({ entity, data, txn }) {
        const sql = this.translator.translateInsertRow(entity, [data]);
        const { insertId } = await this.exec(sql, txn);
        return this.unfoldResult(entity, {
            id: insertId,
            ...data,
        });
    }
    async createMany({ entity, data, txn }) {
        const sql = this.translator.translateInsertRow(entity, data);
        const { insertId } = await this.exec(sql, txn);
        return data.map((d, idx) => this.unfoldResult(entity, {
            id: insertId + idx,
            ...d,
        }));
    }
    async find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }) {
        const sql = this.translator.translateSelect({
            entity,
            projection,
            query,
            indexFrom,
            count,
            sort,
            forUpdate,
        });
        const result = await this.exec(sql, txn);
        return this.unfoldResult(entity, result);
    }
    async stat({ entity, projection, query, txn, groupBy, sort }) {
        const sql = this.translator.translateSelect({
            entity,
            projection,
            query,
            groupBy,
            sort,
        });
        const result = await this.exec(sql, txn);
        return this.unfoldResult(entity, result);
    }
    async updateById({ entity, data, id, txn }) {
        const sql = this.translator.translateUpdate({
            entity,
            data,
            id,
        });
        const result = await this.exec(sql, txn);
        return this.unfoldResult(entity, {
            id,
            ...data,
        });
    }
    async updateByCondition({ entity, data, query, txn }) {
        const sql = this.translator.translateUpdate({
            entity,
            data,
            query,
        });
        await this.exec(sql, txn);
    }
    async removeById({ entity, id, txn }) {
        const sql = this.translator.translateRemove({ entity, id });
        await this.exec(sql, txn);
    }
    async removeByCondition({ entity, query, txn }) {
        const sql = this.translator.translateRemove({ entity, query });
        await this.exec(sql, txn);
    }
}
exports.MySQL = MySQL;
MySQL.ERR_DICT = {
    1062: errorCode_1.ErrorCode.uniqueConstraintViolated,
    1205: errorCode_1.ErrorCode.lockWaitTimeout,
    1213: errorCode_1.ErrorCode.deadlockDetected,
};
