import { add, assign, cloneDeep, now, pick } from 'lodash';
import { Index, Schema } from './Schema';
import { Source } from './source/Source';
import { Data, Result, Row } from './types/Result';
import { Txn, TxnOption } from './types/Txn';

//
import { Driver } from './driver/Driver';
import {MySQL as MySQLDriver } from './driver/MySQL';
import { Trigger, Warden } from './warden';
import { Projection } from './types/Projection';
import { LogicQuery, PlainQuery, Query } from './types/Query';
import { serialUuid } from './utils';
import { ErrorCode } from './errorCode';
import { Sort } from './types/Sort';
import { GroupBy } from './types/GroupBy';
import { LogicOperators } from './types/Operator';
import { assert } from 'console';

export class OakDb extends Warden {

    count({ entity, query, txn }: { entity: string; query?: Query | undefined; txn?: Txn | undefined; }): Promise<number> {
        throw new Error('Method not implemented.');
    }

    schema: Schema;
    source: Source;
    driver: Driver;

    static builtInColumnNames = ['$$createAt$$', '$$updateAt$$', '$$deleteAt$$', 'id', '$$uuid$$'];

    constructor(schema: Schema, source: Source, log?: (message: string) => void) {
        const schema2 = cloneDeep(schema);
        super(schema2, log);
        this.schema = schema2;
        this.source = source;
        this.addBuiltInColumns();
        this.createDefaultTriggers();

        const { name, options } = source;
        switch (name.toLowerCase()) {
            case 'mysql': {
                this.driver = new MySQLDriver(options, schema2);
                break;
            }
            default: {
                throw new Error('暂时不支持的数据源');
            }
        }
    }

    addBuiltInColumns(): void {
        const { schema } = this;
        Object.keys(schema).forEach(
            (entity) => {
                const { attributes, config, indexes } = schema[entity];
                
                assign(attributes, {
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
                const indexCreateAt: Index = {
                    name: `index_createAt`,
                    columns: [{
                        name: '$$createAt$$',
                    }],
                };
                const indexUpdateAt: Index = {
                    name: `index_updateAt`,
                    columns: [{
                        name: '$$updateAt$$',
                    }],
                }
                if (indexes) {
                    indexes.push(indexCreateAt);
                    indexes.push(indexUpdateAt);
                }
                else {
                    assign(schema[entity], {
                        indexes: [indexCreateAt, indexUpdateAt],
                    });
                }

                if (!config || !config.removePhysically) {
                    assign(attributes, {
                        '$$deleteAt$$': {
                            type: 'date',
                            display: {
                                header: '删除时间',                            
                            },
                        },
                    });
                }

                if (config && config.hasUuid) {
                    assign(attributes, {
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
            }
        );
    }

    createDefaultTriggers(): void {
        const { schema } = this;
        Object.keys(schema).forEach(
            (entity) => {
                let createUuid = false;
                let checkUnique: Index[] = [];
                const { attributes, config, indexes } = schema[entity]; 
                if (attributes.hasOwnProperty('$$uuid$$')) {
                    createUuid = true;
                }
                if (indexes) {
                    indexes.forEach(
                        (index) => {
                            if (index.unique) {
                                checkUnique.push(index);
                            }
                        }
                    );
                }
                if (createUuid || checkUnique.length > 0) {
                    // create before trigger for insert action
                    let name = `create default values for ${entity}, includes`;
                    if (createUuid) {
                        name += ' uuid,';
                    }
                    if (checkUnique.length > 0) {
                        checkUnique.forEach(
                            (index) => {
                                name += ` index 【${index.name}】,`;
                            }
                        );
                    }
                    name = name.slice(0, name.length - 1);
                    name += '.';

                    const trigger: Trigger = {
                        name,
                        entity,
                        action: 'insert',
                        before: true,
                        fn: async ({ data, txn }: {
                            data?: Data,
                            txn?: Txn,
                        }): Promise<number> => {
                            let result = 0;
                            if (createUuid && data && !data.$$uuid$$) {
                                assign(data, {
                                    $$uuid$$: serialUuid(64),
                                });
                                result = result + 1;
                            }
                            for (let index of checkUnique) {
                                const { columns } = index;
                                const query = pick(data, Object.keys(columns));
                                const count = await this.count({ entity, query, txn });
                                if (count > 0) {
                                    throw ErrorCode.createError(ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${Object.keys(columns).join(',')} of entity ${entity}`);
                                }
                                result = result + 1;
                            }
                            return result;
                        },
                    };
                    this.registerTrigger(trigger);
                }
            }
        );
    }

    async connect(): Promise<void> {
        return await this.driver.connect();
    }

    async disconnect(): Promise<void> {
        return await this.driver.disconnect();
    }

    /**
     * 初始化对象结构
     */
    async init(replace: boolean = false, excludes?: string[]): Promise<void> {
        return await this.driver.init(replace, excludes);
    }

    /**
     * 销毁对象结构
     * @param truncate 
     * @param excludes 
     */
    async destroy(truncate: boolean = false, excludes?:string[]): Promise<void> {
        return await this.driver.destroy(truncate, excludes);
    }

    async startTransaction(option?: TxnOption): Promise<Txn> {
        return await this.driver.startTransaction(option);
    }

    async commitTransaction(txn: Txn): Promise<void> {
        return await this.driver.commitTransaction(txn);
    }

    async rollbackTransaction(txn: Txn): Promise<void> {
        return await this.driver.rollbackTransaction(txn);
    }

    private async preInsert(entity: string, data: Data, txn?: Txn, context?: object) {
        const now = Date.now();
        assign(data, {
            $$createAt$$: now,
            $$updateAt$$: now,
        });

        if (txn) {
            const triggers = this.getTriggers({ entity, action: 'insert', data });
            if (triggers) {
                // 处理插入前trigger
                const beforeTriggers = triggers.filter(
                    ({ before }) => before
                );
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
    }

    private async postInsert(entity: string, data: Data, row: Row, txn?: Txn, context?: object) {
        if (txn) {
            const triggers = this.getTriggers({ entity, action: 'insert', data });
            if (triggers) {
                // 处理插入后trigger
                const afterTriggers = triggers.filter(
                    ({ before }) => !before
                );
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
    }

    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    async create({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }, context?: object): Promise<Row> {
        await this.preInsert(entity, data, txn, context);
        const row = await this.driver.create({ entity, data, txn });       
        await this.postInsert(entity, data, row, txn, context);

        return row;
    }

    async createMany({ entity, data, txn }:{
        entity: string,
        data: Data[],
        txn?: Txn,
    }, batch?: boolean, context?: object): Promise<Row[]> {
        if (batch) {
            for (let d of data) {
                await this.preInsert(entity, d, txn, context);
            }
            const rows = await this.driver.createMany({ entity, data, txn });
            let idx = 0;
            for (let r of rows) {
                await this.postInsert(entity, data[idx ++], r, txn, context);
            }
            return rows;
        }

        const result: Row[] = [];
        for (let d of data) {
            result.push(await this.create({ entity, data: d, txn }));
        }
        return result;
    }

    /**
     * 同create
     * @param param0 
     */
    async insert({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }, context?: object): Promise<Row> {
        return await this.create({ entity, data, txn }, context);
    }

    async insertMany({ entity, data, txn }:{
        entity: string,
        data: Data[],
        txn?: Txn,
    }, batch?: boolean, context?: object): Promise<Row[]> {
        return this.createMany({ entity, data, txn }, batch, context);
    }

    addDeleteAtColumnCheck(query: Query, entity: string): void {
        const { attributes } = this.schema[entity];
        let added = false;
        Object.keys(query).forEach(
            (attr) => {
                if (LogicOperators.includes(attr)) {
                    if (query[attr] instanceof Array) {
                        (query[attr] as PlainQuery[] | LogicQuery[]).forEach(
                            (subQuery) => this.addDeleteAtColumnCheck(subQuery, entity)
                        );
                    }
                    else {
                        this.addDeleteAtColumnCheck(query[attr] as Query, entity);
                    }
                }
                else {
                    if (!added) {
                        assign(query, {
                            $$deleteAt$$: {
                                $exists: false,
                            },
                        }),
                        added = true;
                    }
                    if (attributes.hasOwnProperty(attr)) {
                        const { type, ref } = attributes[attr];
                        if (type === 'ref') {
                            this.addDeleteAtColumnCheck(query[attr] as PlainQuery | LogicQuery, ref as string);
                        }
                    }
                }
            }
        );
    }

    async find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate, groupBy }: { 
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
        sort?: Sort;
        groupBy?: GroupBy;
    }, context?: object): Promise<Row[]> {
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
        const rows:Row[] = await this.driver.find({
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
    async findById({ entity, projection, id, txn }: {
        entity: string;
        projection?: Projection;
        id: string | number;
        txn?: Txn;
    }, context?: object): Promise<Row> {
        const [ row ] = await this.driver.find({
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

    private async preUpdate(entity: string, data: Data, id?: string|number, row?:Row, txn?: Txn, context?: object): Promise<Row | undefined> {
        const now = Date.now();
        assign(data, {
            $$updateAt$$: now,
        });

        let row2: Row | undefined;
        if (txn) {
            const possibleTriggers = this.getTriggers({ entity, action: 'update', data, row });
            if (possibleTriggers) {
                if (!row) {
                    row2 = await this.findById({ entity, id: id as string|number, txn });
                }
                let beforeTriggers = possibleTriggers.filter(
                    ({ before }) => before
                );

                if (!row) {
                    beforeTriggers = beforeTriggers.filter(
                        (trigger) => !trigger.valueCheck || trigger.valueCheck({ row: row2, data })
                    );
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
        }

        return row2;
    }

    private async postUpdate(entity: string, data: Data, row:Row, txn?: Txn, context?: object): Promise<void>  {
        if (txn) {
            const Triggers = this.getTriggers({ entity, action: 'update', data, row });
            if (Triggers) {
                let afterTriggers = Triggers.filter(
                    ({ before }) => !before
                );
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
    }

    async update({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<Row> {
        assert(id || row);
        const row2 = await this.preUpdate(entity, data, id, row, txn, context);
        
        const result = await this.driver.updateById({
            entity,
            data,
            id: id || (row as Row).id,
            txn,
        });

        const rowNow = assign({}, row || row2, data);
        await this.postUpdate(entity, data, rowNow as Row, txn, context);        
        return result;
    }

    async updateMany({ entity, data, query, txn }: {
        entity: string;
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void> {
        assign(data, {
            $$updateAt$$: Date.now(),
        });
        await this.driver.updateByCondition({
            entity,
            data,
            query,
            txn,
        });
    }

    private async preRemove(entity: string, id?: string | number, row?: Row, txn?: Txn, context?: object): Promise<{ deletePhysically: boolean; row?: Row; }> {
        const { attributes } = this.schema[entity];
        let deletePhysically = true;
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            deletePhysically = false;            
        }
        
        let row2: Row | undefined;
        if (txn) {
            const possibleTriggers = this.getTriggers({ entity, action: 'remove', row });
            if (possibleTriggers) {
                if (!row) {
                    row2 = await this.findById({ entity, id: id as string|number, txn });
                }
                let beforeTriggers = possibleTriggers.filter(
                    ({ before }) => before
                );
                if (!row) {
                    beforeTriggers = beforeTriggers.filter(
                        (trigger) => !trigger.valueCheck || trigger.valueCheck({ row: row2 })
                    );
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
        }
        return {
            deletePhysically,
            row: row || row2,
        };
    }

    private async postRemove(entity: string, row: Row, txn?: Txn, context?: object): Promise<void> {
        if (txn) {
            const Triggers = this.getTriggers({ entity, action: 'remove', row });
            if (Triggers) {
                let beforeTriggers = Triggers.filter(
                    ({ before }) => !before
                );
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
    }

    async remove({ entity, id, row, txn }: {
        entity: string;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<Row> {
        const {
            deletePhysically,
            row: row2,
        } = await this.preRemove(entity, id, row, txn, context);

        if (deletePhysically) {
            await this.driver.removeById({ entity, id: (id || (row2 && row2.id)) as string | number, txn });
        }
        else {
            await this.driver.updateById({ entity, data: {
                $$deleteAt$$: Date.now(),
            }, id: (id || (row2 && row2.id)) as string | number, txn});
        }
        
        await this.postRemove(entity, row2 as Row, txn, context);
        
        return row || { id: id as string | number };
    }

    async removeMany({ entity, query, txn} : {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void> {
        const { attributes } = this.schema[entity];
        if (attributes.hasOwnProperty('$$deleteAt$$')) {
            await this.updateMany({ entity, data: {
                $$deleteAt$$: Date.now(),
            }, query, txn});
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