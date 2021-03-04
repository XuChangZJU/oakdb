import { Driver } from './Driver';
import { ConnectionOptions } from '../source/Source';
import { DataType, PrimaryGeneratedColumnType } from '../DataType';
import { DataTypeDefaults, DataTypeParams } from '../DataTypeDefaults';
import { Schema, Attribute, Column, Index } from '../Schema';
import { Data, Result, Row, Value } from '../types/Result';
import { Txn, TxnOption } from '../types/Txn';
import { MySQLTranslator } from '../translator/MySQLTranslator';
import assert from 'assert';
import { v4 } from 'uuid';
import { assign, unset } from 'lodash';
import { promises } from 'fs';
import { Projection } from '../types/Projection';
import { LogicQuery, PlainQuery, Query } from '../types/Query';
import { Sort } from '../types/Sort';
import { GroupBy } from '../types/GroupBy';
import { ErrorCode } from '../errorCode';
import { SqlInMemory } from 'typeorm/driver/SqlInMemory';

function convertGeoTextToObject(geoText: string): object {
    if (geoText.startsWith('POINT')) {
        const coord = geoText.match((/\d+(?=\)|\s)/g)) as string[];

        return {
            type: 'Point',
            coordinates: coord.map(
                ele => parseFloat(ele)
            ),
        };
    }
    else {
        throw ErrorCode.createError(ErrorCode.unsupportedYet, 'only support Point now');
    }
}

export class MySQL extends Driver {
    mysql: any;

    debug: boolean = false;

    connectionPool: any;

    transactions: {
        [propName: string]: Txn,
    };
    
    readonly translator: MySQLTranslator;

    constructor(options: ConnectionOptions, schema: Schema, log?:(message: string) => void) {
        super(options, schema, log);
        const { database } = options;
        this.database = database;
        this.mysql = require('mysql');
        this.addForeignKeyColumns(this.schema);
        this.translator = new MySQLTranslator(this.schema);
        this.transactions = {};
    }

    getPrimaryKeyType(): PrimaryGeneratedColumnType {
        return 'bigint';
    }

    /**
     * 为所有的ref类型创建`${ref}Id`列，并创建外键的索引
     */
    private addForeignKeyColumns(schema: Schema) {

    }

    async connect(): Promise<void> {
        this.connectionPool = await this.mysql.createPool(this.options);
    }

    async disconnect(): Promise<void> {
        await this.connectionPool.end();
    }

    unfoldResult(entity: string, result: Result | Result[]): Result | Result[] {
        const { schema } = this;
        function resolveAttribute(entity2: string, r: {
            [propName: string]: any;
        }, attr: string, value: any) {
            const { attributes } = schema[entity2];
            const i = attr.indexOf(".");
            if (i !== -1) {
                const attrHead = attr.slice(0, i);
                const attrTail = attr.slice(i + 1);
                if (!r[attrHead]) {
                    r[attrHead] = {};
                }
                assert(attributes[attrHead] && attributes[attrHead].type === 'ref');
                resolveAttribute(attributes[attrHead].ref as string, r[attrHead], attrTail, value);
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


        function formalizeNullObject(r: {
            [propName: string]: any;
        }) {
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

        function unfoldRow(r: Result): Result {
            let result2 = {};
            for (let attr in r) {
                const value = r[attr];
                resolveAttribute(entity, result2, attr, value);
            }
    
            formalizeNullObject(result2);
            return result2 as Row;
        }

        if (result instanceof Array) {
            return result.map(
                r => unfoldRow(r)
            );
        }
        return unfoldRow(result);
    }

    static ERR_DICT: {
        [name: string]: number;
    } = {
        1062: ErrorCode.uniqueConstraintViolated,
        1205: ErrorCode.lockWaitTimeout,
        1213: ErrorCode.deadlockDetected,
    }

    translateToOakError(err: {
        errno: number,
        sqlMessage: string,
    }): Error {
        const code = MySQL.ERR_DICT[err.errno];
        if (code) {
            return ErrorCode.createError(code, err.sqlMessage);
        }
        return ErrorCode.createError(ErrorCode.databaseError, err.sqlMessage);
    }

    async exec(sql: string, txn?: Txn): Promise<any> {
        const { NODE_ENV } = process.env;
        if (NODE_ENV && NODE_ENV.toLowerCase() === 'dev') {
            this.log(sql);
        }
        let result;
        if (txn) {
            const { data: connection } = txn;
            
            result = await new Promise(
                (resolve, reject) => {
                    connection.query(sql, (err: {
                        errno: number,
                        sqlMessage: string,
                    }, result: any, fields: any) => {
                        if (err) {
                            this.log(`sql exec err: ${sql}`);
                            return reject(this.translateToOakError(err));
                        }
    
                        return resolve(result);
                    });
                }
            );
        }
        else {
            result = await new Promise(
                (resolve, reject) => {
                    // if (process.env.DEBUG) {
                    //  console.log(sql);
                    //}
                    this.connectionPool.query(sql, (err: {
                        errno: number,
                        sqlMessage: string,
                    }, result: any, fields: any) => {
                        if (err) {                            ;
                            return reject(this.translateToOakError(err));
                        }
    
                        return resolve(result);
                    })
                }
            );
        }

        return result;
    }

    async init(replace: boolean, excludes?: string[]): Promise<void> {
        const entities = Object.keys(this.schema);

        for (let entity of entities) {
            if (excludes && excludes.includes(entity)) {
                continue;
            }
            const sql = this.translator.translateCreateEntity(entity, { replace });
            await(this.exec(sql));
        }

        return;
    }

    async destroy(truncate?: boolean, excludes?: string[]): Promise<void> {
        const entities = Object.keys(this.schema);

        for (let entity of entities) {
            if (excludes && excludes.includes(entity)) {
                continue;
            }
            const sql = this.translator.translateDestroyEntity(entity, truncate);
            await(this.exec(sql));
        }

        return;
    }

    async startTransaction(option?: TxnOption): Promise<Txn> {
        return await new Promise(
            (resolve, reject) => {
                this.connectionPool.getConnection((err: Error, connection: any) => {
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
                        connection.query(sql, (err2: Error) => {
                            if (err2) {
                                return reject(err2);
                            }

                            const id = v4();
                            const txn = new Txn(id, connection);
                            assign(this.transactions, {
                                [id]: txn,
                            });
                            
                            resolve(txn);
                        });
                    }
                    if (isolationLevel) {
                        connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel};`, (err2: Error) => {
                            if (err2) {
                                return reject(err2);
                            }
                            startTxn();
                        });
                    }
                    else {
                        startTxn();
                    }
                })
            }
        )
    }

    async commitTransaction(txn: Txn): Promise<void> {
        const { data: connection } = txn;

        return await new Promise(
            (resolve, reject) => {
                connection.query('COMMIT;', (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    connection.release();
                    unset(this.transactions, txn.id);
                    txn.emit('committed');
                    resolve();
                });
            }
        );
    }


    async rollbackTransaction(txn: Txn): Promise<void> {
        const { data: connection } = txn;

        return await new Promise(
            (resolve, reject) => {
                connection.query('ROLLBACK;', (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    connection.release();
                    unset(this.transactions, txn.id);
                    txn.emit('rollbacked');
                    resolve();
                });
            }
        );
    }


    getTransactionById(id: string): Txn {
        return this.transactions[id];
    }

   
    async create({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }): Promise<Row> {        
        const sql = this.translator.translateInsertRow(entity, [data]);

        const { insertId } = await this.exec(sql, txn);
        
        return this.unfoldResult(entity, {
            id: insertId,
            ...data,
        }) as Row;
    }

    async createMany({entity, data, txn}: {
        entity: string,
        data: Data[],
        txn?: Txn,
    }): Promise<Row[]> {
        const sql = this.translator.translateInsertRow(entity, data);

        const { insertId } = await this.exec(sql, txn);

        return data.map(
            (d, idx) =>
                this.unfoldResult(entity, {
                    id: insertId + idx,
                    ...d,
                }) as Row
        );
    }
    
    async find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        sort?: Sort;
        forUpdate?: boolean;
    }): Promise<Row[]> {
        const sql = this.translator.translateSelect({
            entity,
            projection,
            query,
            indexFrom,
            count,
            sort,
            forUpdate,
        });

        const result  =  await this.exec(sql, txn);
        return this.unfoldResult(entity, result) as Row[];
    }

    async stat({ entity, projection, query, txn, groupBy, sort}: {
        entity: string; 
        projection?: Projection | undefined; 
        query?: Query | undefined; 
        txn?: Txn | undefined; 
        groupBy?: GroupBy;
        sort?: Sort;
    }): Promise<Result[]> {
        const sql = this.translator.translateSelect({
            entity,
            projection,
            query,
            groupBy,
            sort,
        });

        const result  =  await this.exec(sql, txn);
        return this.unfoldResult(entity, result) as Result[];
    }

    async updateById({ entity, data, id, txn }: {
        entity: string,
        data: Data;
        id: string | number;
        txn?: Txn;
    }): Promise<Row> {
        const sql = this.translator.translateUpdate({
            entity,
            data,
            id,
        });

        const result =  await this.exec(sql, txn);
        return this.unfoldResult(entity, {
            id,
            ...data,
        }) as Row;
    }

    async updateByCondition({ entity, data, query, txn }: {
        entity: string,
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void> {
        const sql = this.translator.translateUpdate({
            entity,
            data,
            query,
        });

        await this.exec(sql, txn);        
    }

    async removeById({ entity, id, txn }: {
        entity: string;
        id: string | number;
        txn?: Txn;
    }): Promise<void> {
        const sql = this.translator.translateRemove({ entity, id });

        await this.exec(sql, txn);
    }

    async removeByCondition({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void> {
        const sql = this.translator.translateRemove({ entity, query });

        await this.exec(sql, txn);
    }
}