"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OakDb = void 0;
const lodash_1 = require("lodash");
const MySQL_1 = require("./driver/MySQL");
const warden_1 = require("./warden");
const utils_1 = require("./utils");
const errorCode_1 = require("./errorCode");
const Operator_1 = require("./types/Operator");
const console_1 = require("console");
class OakDb extends warden_1.Warden {
    constructor(schema, source, log) {
        const schema2 = lodash_1.cloneDeep(schema);
        super(schema2, log);
        this.schema = schema2;
        this.source = source;
        const { name, options } = source;
        switch (name.toLowerCase()) {
            case 'mysql': {
                this.driver = new MySQL_1.MySQL(options, schema2, log);
                break;
            }
            default: {
                throw new Error('暂时不支持的数据源');
            }
        }
        this.addBuiltInColumns();
        this.createDefaultTriggers();
    }
    async count({ entity, query, txn }) {
        const projection = {
            $fncall1: {
                $format: 'count(%s)',
                $attrs: ['id'],
                $as: 'cnt',
            }
        };
        const [result] = await this.stat({ entity, projection, query, txn });
        return result.cnt;
    }
    addBuiltInColumns() {
        const { schema } = this;
        Object.keys(schema).forEach((entity) => {
            const { attributes, config, indexes } = schema[entity];
            const foreignKeyColumns = {};
            const foreignKeyIndexes = [];
            Object.keys(attributes).forEach((attr) => {
                const { type } = attributes[attr];
                if (type === 'ref') {
                    Object.assign(foreignKeyColumns, {
                        [`${attributes[attr].ref}Id`]: {
                            type: this.driver.getPrimaryKeyType(),
                            display: {
                                header: `${attributes[attr].ref}Id`,
                            },
                        },
                    });
                    foreignKeyIndexes.push({
                        name: `index_${attributes[attr].ref}Id`,
                        columns: [{
                                name: `${attributes[attr].ref}Id`,
                            }],
                    });
                }
            });
            Object.assign(attributes, foreignKeyColumns, {
                '$$createAt$$': {
                    type: 'date',
                    notNull: true,
                    display: {
                        header: '创建时间',
                    },
                },
                '$$updateAt$$': {
                    type: 'date',
                    notNull: true,
                    display: {
                        header: '更新时间',
                    },
                },
                'id': {
                    type: this.driver.getPrimaryKeyType(),
                    notNull: true,
                    display: {
                        header: '主键',
                        weight: 200,
                    },
                },
            });
            const indexCreateAt = {
                name: `index_createAt`,
                columns: [{
                        name: '$$createAt$$',
                    }],
            };
            const indexUpdateAt = {
                name: `index_updateAt`,
                columns: [{
                        name: '$$updateAt$$',
                    }],
            };
            if (indexes) {
                indexes.push(indexCreateAt);
                indexes.push(indexUpdateAt);
                Object.assign(schema[entity], {
                    indexes: indexes.concat(foreignKeyIndexes),
                });
            }
            else {
                lodash_1.assign(schema[entity], {
                    indexes: foreignKeyIndexes.concat([indexCreateAt, indexUpdateAt]),
                });
            }
            if (!config || !config.removePhysically) {
                lodash_1.assign(attributes, {
                    '$$deleteAt$$': {
                        type: 'date',
                        display: {
                            header: '删除时间',
                        },
                    },
                });
            }
            if (config && config.hasUuid) {
                lodash_1.assign(attributes, {
                    '$$uuid$$': {
                        type: 'varchar',
                        params: {
                            length: 64,
                        },
                        unique: true,
                        notNull: true,
                        display: {
                            header: 'uuid',
                        },
                    },
                });
            }
        });
    }
    createDefaultTriggers() {
        const { schema } = this;
        Object.keys(schema).forEach((entity) => {
            let createUuid = false;
            let checkNotNull = [];
            const { attributes, config, uniqueConstraints } = schema[entity];
            if (attributes.hasOwnProperty('$$uuid$$')) {
                createUuid = true;
            }
            for (let attr in attributes) {
                if (attributes[attr].notNull) {
                    if (attributes[attr].type === 'ref') {
                        checkNotNull.push(`${attr}Id`);
                    }
                    else {
                        checkNotNull.push(attr);
                    }
                }
            }
            if (createUuid || uniqueConstraints && uniqueConstraints.length > 0) {
                // create before trigger for insert action
                const name = `check insert value for ${entity}`;
                const trigger = {
                    name,
                    entity,
                    action: 'insert',
                    before: true,
                    fn: async ({ data, txn }) => {
                        let result = 0;
                        if (createUuid && data && !data.$$uuid$$) {
                            lodash_1.assign(data, {
                                $$uuid$$: utils_1.serialUuid(64),
                            });
                            result = result + 1;
                        }
                        if (uniqueConstraints && uniqueConstraints.length > 0) {
                            for (let uc of uniqueConstraints) {
                                const uc2 = uc.map((c) => {
                                    if (attributes[c].type === 'ref') {
                                        return `${c}Id`;
                                    }
                                    return c;
                                });
                                const query = lodash_1.pick(data, uc2);
                                const count = await this.count({ entity, query, txn });
                                if (count > 0) {
                                    throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${uc.join(',')} of entity ${entity} on insert`);
                                }
                            }
                        }
                        if (checkNotNull.length > 0) {
                            const nullAttr = checkNotNull.find((attr) => data && data[attr] === null);
                            if (nullAttr) {
                                throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.notNullConstraintViolated, `not null constraint violated on ${nullAttr} of entity ${entity} on insert`);
                            }
                        }
                        return result;
                    },
                };
                this.registerTrigger(trigger);
            }
            if (uniqueConstraints && uniqueConstraints.length > 0) {
                const name = ` check value when update  ${entity} `;
                const trigger = {
                    name,
                    entity,
                    action: 'update',
                    attributes: lodash_1.union.apply(null, uniqueConstraints),
                    before: true,
                    fn: async ({ data, row, txn }) => {
                        console_1.assert(data && row);
                        let result = 0;
                        if (uniqueConstraints && uniqueConstraints.length > 0) {
                            for (let uc of uniqueConstraints) {
                                const uc2 = uc.map((c) => {
                                    if (attributes[c].type === 'ref') {
                                        return `${c}Id`;
                                    }
                                    return c;
                                });
                                const query = lodash_1.assign(lodash_1.pick(row, uc2), lodash_1.pick(data, uc2));
                                const count = await this.count({ entity, query, txn });
                                if (count > 0) {
                                    throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${uc.join(',')} of entity ${entity} on update`);
                                }
                                result = result + 1;
                            }
                        }
                        if (checkNotNull.length > 0) {
                            const nullAttr = checkNotNull.map((attr) => data && data[attr] === null);
                            if (nullAttr) {
                                throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.notNullConstraintViolated, `not null constraint violated on ${nullAttr} of entity ${entity} on update`);
                            }
                        }
                        return result;
                        return result;
                    },
                };
                this.registerTrigger(trigger);
            }
        });
    }
    async connect() {
        return await this.driver.connect();
    }
    async disconnect() {
        return await this.driver.disconnect();
    }
    /**
     * 初始化对象结构
     */
    async init(replace = false, excludes) {
        return await this.driver.init(replace, excludes);
    }
    /**
     * 销毁对象结构
     * @param truncate
     * @param excludes
     */
    async destroy(truncate = false, excludes) {
        return await this.driver.destroy(truncate, excludes);
    }
    async startTransaction(option) {
        return await this.driver.startTransaction(option);
    }
    async commitTransaction(txn) {
        return await this.driver.commitTransaction(txn);
    }
    async rollbackTransaction(txn) {
        return await this.driver.rollbackTransaction(txn);
    }
    async preInsert(entity, data, txn, context) {
        const now = Date.now();
        lodash_1.assign(data, {
            $$createAt$$: now,
            $$updateAt$$: now,
        });
        const triggers = this.getTriggers({ entity, action: 'insert', data });
        if (triggers) {
            // 处理插入前trigger
            const beforeTriggers = triggers.filter(({ before }) => before);
            if (beforeTriggers.length > 0) {
                await this.execTriggers({
                    triggers: beforeTriggers,
                    data,
                    txn,
                    context,
                });
            }
        }
    }
    async postInsert(entity, data, row, txn, context) {
        const triggers = this.getTriggers({ entity, action: 'insert', data });
        if (triggers) {
            // 处理插入后trigger
            const afterTriggers = triggers.filter(({ before }) => !before);
            if (afterTriggers.length > 0) {
                await this.execTriggers({
                    triggers: afterTriggers,
                    data,
                    row,
                    txn,
                    context,
                });
            }
        }
    }
    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    async create({ entity, data, txn }, context) {
        await this.preInsert(entity, data, txn, context);
        const row = await this.driver.create({ entity, data, txn });
        await this.postInsert(entity, data, row, txn, context);
        return row;
    }
    async createMany({ entity, data, txn }, batch, context) {
        if (batch) {
            for (let d of data) {
                await this.preInsert(entity, d, txn, context);
            }
            const rows = await this.driver.createMany({ entity, data, txn });
            let idx = 0;
            for (let r of rows) {
                await this.postInsert(entity, data[idx++], r, txn, context);
            }
            return rows;
        }
        const result = [];
        for (let d of data) {
            result.push(await this.create({ entity, data: d, txn }));
        }
        return result;
    }
    /**
     * 同create
     * @param param0
     */
    async insert({ entity, data, txn }, context) {
        return await this.create({ entity, data, txn }, context);
    }
    async insertMany({ entity, data, txn }, batch, context) {
        return this.createMany({ entity, data, txn }, batch, context);
    }
    addDeleteAtColumnCheck(query, entity) {
        const { attributes } = this.schema[entity];
        let added = false;
        Object.keys(query).forEach((attr) => {
            if (Operator_1.LogicOperators.includes(attr)) {
                if (query[attr] instanceof Array) {
                    query[attr].forEach((subQuery) => this.addDeleteAtColumnCheck(subQuery, entity));
                }
                else {
                    this.addDeleteAtColumnCheck(query[attr], entity);
                }
            }
            else {
                if (!added) {
                    lodash_1.assign(query, {
                        $$deleteAt$$: {
                            $exists: false,
                        },
                    }),
                        added = true;
                }
                if (attributes.hasOwnProperty(attr)) {
                    const { type, ref } = attributes[attr];
                    if (type === 'ref') {
                        this.addDeleteAtColumnCheck(query[attr], ref);
                    }
                }
            }
        });
    }
    /**
     * select entity data
     * if there exists some aggregation fncall in projection, please use stat
     * @param param0
     * @param context
     */
    async find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }, context) {
        const { attributes } = this.schema[entity];
        let query2 = query;
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            if (query2) {
                this.addDeleteAtColumnCheck(query2, entity);
            }
            else {
                query2 = {
                    $$deleteAt$$: {
                        $exists: false,
                    },
                };
            }
        }
        const rows = await this.driver.find({
            entity,
            projection,
            query: query2,
            indexFrom,
            count,
            txn,
            forUpdate,
            sort,
        });
        if (txn) {
            for (let row of rows) {
                const triggers = this.getTriggers({
                    entity,
                    action: 'select',
                    row,
                });
                if (triggers && triggers.length > 0) {
                    await this.execTriggers({
                        triggers,
                        row,
                        txn,
                        context,
                    });
                }
            }
        }
        return rows;
    }
    async stat({ entity, projection, query, txn, sort, groupBy }, context) {
        const { attributes } = this.schema[entity];
        let query2 = query;
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            if (query2) {
                this.addDeleteAtColumnCheck(query2, entity);
            }
            else {
                query2 = {
                    $$deleteAt$$: {
                        $exists: false,
                    },
                };
            }
        }
        // if there exists some aggregation fncall in projection, please use stat
        const results = await this.driver.stat({
            entity,
            projection,
            query: query2,
            groupBy,
            txn,
            sort,
        });
        return results;
    }
    async findById({ entity, projection, id, txn }, context) {
        const [row] = await this.driver.find({
            entity,
            projection,
            query: { id },
            indexFrom: 0,
            count: 1,
            txn,
        });
        if (txn && row) {
            const triggers = this.getTriggers({
                entity,
                action: 'select',
                row,
            });
            if (triggers && triggers.length > 0) {
                await this.execTriggers({
                    triggers,
                    row,
                    txn,
                    context,
                });
            }
        }
        return row;
    }
    async preUpdate(entity, data, id, row, txn, context) {
        const now = Date.now();
        lodash_1.assign(data, {
            $$updateAt$$: now,
        });
        let row2;
        const possibleTriggers = this.getTriggers({ entity, action: 'update', data, row });
        if (possibleTriggers) {
            if (!row) {
                row2 = await this.findById({ entity, id: id, txn });
            }
            let beforeTriggers = possibleTriggers.filter(({ before }) => before);
            if (!row) {
                beforeTriggers = beforeTriggers.filter((trigger) => !trigger.valueCheck || trigger.valueCheck({ row: row2, data }));
            }
            if (beforeTriggers.length > 0) {
                await this.execTriggers({
                    triggers: beforeTriggers,
                    data,
                    row: row || row2,
                    txn,
                    context,
                });
            }
        }
        return row2;
    }
    async postUpdate(entity, data, row, txn, context) {
        const Triggers = this.getTriggers({ entity, action: 'update', data, row });
        if (Triggers) {
            let afterTriggers = Triggers.filter(({ before }) => !before);
            if (afterTriggers.length > 0) {
                await this.execTriggers({
                    triggers: afterTriggers,
                    data,
                    row,
                    txn,
                    context,
                });
            }
        }
    }
    async update({ entity, data, id, row, txn }, context) {
        console_1.assert(id || row);
        const row2 = await this.preUpdate(entity, data, id, row, txn, context);
        const result = await this.driver.updateById({
            entity,
            data,
            id: (id || row.id),
            txn,
        });
        const rowNow = lodash_1.assign({}, row || row2, data);
        await this.postUpdate(entity, data, rowNow, txn, context);
        return result;
    }
    async updateMany({ entity, data, query, txn }) {
        lodash_1.assign(data, {
            $$updateAt$$: Date.now(),
        });
        await this.driver.updateByCondition({
            entity,
            data,
            query,
            txn,
        });
    }
    async preRemove(entity, id, row, txn, context) {
        const { attributes } = this.schema[entity];
        let deletePhysically = true;
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            deletePhysically = false;
        }
        let row2;
        const possibleTriggers = this.getTriggers({ entity, action: 'remove', row });
        if (possibleTriggers) {
            if (!row) {
                row2 = await this.findById({ entity, id: id, txn });
            }
            let beforeTriggers = possibleTriggers.filter(({ before }) => before);
            if (!row) {
                beforeTriggers = beforeTriggers.filter((trigger) => !trigger.valueCheck || trigger.valueCheck({ row: row2 }));
            }
            if (beforeTriggers.length > 0) {
                await this.execTriggers({
                    triggers: beforeTriggers,
                    row: row || row2,
                    txn,
                    context,
                });
            }
        }
        return {
            deletePhysically,
            row: row || row2,
        };
    }
    async postRemove(entity, row, txn, context) {
        const Triggers = this.getTriggers({ entity, action: 'remove', row });
        if (Triggers) {
            let beforeTriggers = Triggers.filter(({ before }) => !before);
            if (beforeTriggers.length > 0) {
                await this.execTriggers({
                    triggers: beforeTriggers,
                    row,
                    txn,
                    context,
                });
            }
        }
    }
    async remove({ entity, id, row, txn }, context) {
        const { deletePhysically, row: row2, } = await this.preRemove(entity, id, row, txn, context);
        if (deletePhysically) {
            await this.driver.removeById({ entity, id: (id || (row2 && row2.id)), txn });
        }
        else {
            await this.driver.updateById({
                entity, data: {
                    $$deleteAt$$: Date.now(),
                },
                id: (id || (row2 && row2.id)),
                txn
            });
        }
        await this.postRemove(entity, row2, txn, context);
        return row || { id: id };
    }
    async removeMany({ entity, query, txn }) {
        const { attributes } = this.schema[entity];
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            await this.updateMany({
                entity, data: {
                    $$deleteAt$$: Date.now(),
                }, query, txn
            });
        }
        else {
            await this.driver.removeByCondition({
                entity,
                query,
                txn,
            });
        }
    }
}
exports.OakDb = OakDb;
OakDb.builtInColumnNames = ['$$createAt$$', '$$updateAt$$', '$$deleteAt$$', 'id', '$$uuid$$'];
