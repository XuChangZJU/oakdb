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
        this.addBuiltInColumns();
        this.createDefaultTriggers();
        const { name, options } = source;
        switch (name.toLowerCase()) {
            case 'mysql': {
                this.driver = new MySQL_1.MySQL(options, schema2);
                break;
            }
            default: {
                throw new Error('暂时不支持的数据源');
            }
        }
    }
    count({ entity, query, txn }) {
        throw new Error('Method not implemented.');
    }
    addBuiltInColumns() {
        const { schema } = this;
        Object.keys(schema).forEach((entity) => {
            const { attributes, config, indexes } = schema[entity];
            lodash_1.assign(attributes, {
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
            }
            else {
                lodash_1.assign(schema[entity], {
                    indexes: [indexCreateAt, indexUpdateAt],
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
            let checkUnique = [];
            const { attributes, config, indexes } = schema[entity];
            if (attributes.hasOwnProperty('$$uuid$$')) {
                createUuid = true;
            }
            if (indexes) {
                indexes.forEach((index) => {
                    if (index.unique) {
                        checkUnique.push(index);
                    }
                });
            }
            if (createUuid || checkUnique.length > 0) {
                // create before trigger for insert action
                let name = `create default values for ${entity}, includes`;
                if (createUuid) {
                    name += ' uuid,';
                }
                if (checkUnique.length > 0) {
                    checkUnique.forEach((index) => {
                        name += ` index 【${index.name}】,`;
                    });
                }
                name = name.slice(0, name.length - 1);
                name += '.';
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
                        for (let index of checkUnique) {
                            const { columns } = index;
                            const query = lodash_1.pick(data, Object.keys(columns));
                            const count = await this.count({ entity, query, txn });
                            if (count > 0) {
                                throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${Object.keys(columns).join(',')} of entity ${entity}`);
                            }
                            result = result + 1;
                        }
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
    async preInsert(entity, data, txn) {
        const now = Date.now();
        lodash_1.assign(data, {
            $$createAt$$: now,
            $$updateAt$$: now,
        });
        if (txn) {
            const triggers = this.getTriggers({ entity, action: 'insert', data });
            if (triggers) {
                // 处理插入前trigger
                const beforeTriggers = triggers.filter(({ before }) => before);
                if (beforeTriggers.length > 0) {
                    await this.execTriggers({
                        triggers: beforeTriggers,
                        data,
                        txn,
                    });
                }
            }
        }
    }
    async postInsert(entity, data, row, txn) {
        if (txn) {
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
                    });
                }
            }
        }
    }
    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    async create({ entity, data, txn }) {
        await this.preInsert(entity, data, txn);
        const row = await this.driver.create({ entity, data, txn });
        await this.postInsert(entity, data, row, txn);
        return row;
    }
    async createMany({ entity, data, txn }, batch) {
        if (batch) {
            for (let d of data) {
                await this.preInsert(entity, d, txn);
            }
            const rows = await this.driver.createMany({ entity, data, txn });
            let idx = 0;
            for (let r of rows) {
                await this.postInsert(entity, data[idx++], r, txn);
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
    async insert({ entity, data, txn }) {
        return await this.create({ entity, data, txn });
    }
    async insertMany({ entity, data, txn }, batch) {
        return this.createMany({ entity, data, txn }, batch);
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
    async find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate, groupBy }) {
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
        return await this.driver.find({
            entity,
            projection,
            query: query2,
            indexFrom,
            count,
            txn,
            forUpdate,
            sort,
            groupBy,
        });
    }
    async findById({ entity, projection, id, txn }) {
        const [result] = await this.driver.find({
            entity,
            projection,
            query: { id },
            indexFrom: 0,
            count: 1,
            txn,
        });
        return result;
    }
    async preUpdate(entity, data, id, row, txn) {
        const now = Date.now();
        lodash_1.assign(data, {
            $$updateAt$$: now,
        });
        let row2;
        if (txn) {
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
                    });
                }
            }
        }
        return row2;
    }
    async postUpdate(entity, data, row, txn) {
        if (txn) {
            const Triggers = this.getTriggers({ entity, action: 'update', data, row });
            if (Triggers) {
                let afterTriggers = Triggers.filter(({ before }) => !before);
                if (afterTriggers.length > 0) {
                    await this.execTriggers({
                        triggers: afterTriggers,
                        data,
                        row,
                        txn,
                    });
                }
            }
        }
    }
    async update({ entity, data, id, row, txn }) {
        console_1.assert(id || row);
        const row2 = await this.preUpdate(entity, data, id, row, txn);
        const result = await this.driver.updateById({
            entity,
            data,
            id: id || row.id,
            txn,
        });
        const rowNow = lodash_1.assign({}, row || row2, data);
        await this.postUpdate(entity, data, rowNow, txn);
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
    async preRemove(entity, id, row, txn) {
        const { attributes } = this.schema[entity];
        let deletePhysically = true;
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            deletePhysically = false;
        }
        let row2;
        if (txn) {
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
                    });
                }
            }
        }
        return {
            deletePhysically,
            row: row || row2,
        };
    }
    async postRemove(entity, row, txn) {
        if (txn) {
            const Triggers = this.getTriggers({ entity, action: 'remove', row });
            if (Triggers) {
                let beforeTriggers = Triggers.filter(({ before }) => !before);
                if (beforeTriggers.length > 0) {
                    await this.execTriggers({
                        triggers: beforeTriggers,
                        row,
                        txn,
                    });
                }
            }
        }
    }
    async remove({ entity, id, row, txn }) {
        const { deletePhysically, row: row2, } = await this.preRemove(entity, id, row, txn);
        if (deletePhysically) {
            await this.driver.removeById({ entity, id: (id || (row2 && row2.id)), txn });
        }
        else {
            await this.driver.updateById({ entity, data: {
                    $$deleteAt$$: Date.now(),
                }, id: (id || (row2 && row2.id)), txn });
        }
        await this.postRemove(entity, row2, txn);
        return row || { id: id };
    }
    async removeMany({ entity, query, txn }) {
        const { attributes } = this.schema[entity];
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            await this.updateMany({ entity, data: {
                    $$deleteAt$$: Date.now(),
                }, query, txn });
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
