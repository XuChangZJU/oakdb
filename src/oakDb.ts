import { add, assign, cloneDeep, now, pick, union } from 'lodash';
import { Index, Schema } from './Schema';
import { Source } from './source/Source';
import { Data, Result, Row } from './types/Result';
import { Txn, TxnOption } from './types/Txn';

//
import { Driver } from './driver/Driver';
import { MySQL as MySQLDriver } from './driver/MySQL';
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

    async count({ entity, query, txn }: { entity: string; query?: Query | undefined; txn?: Txn | undefined; }): Promise<number> {
        const projection: Projection = {
            $fncall1: {
                $format: 'count(%s)',
                $attrs: ['id'],
                $as: 'cnt',
            }
        };
        const [result] = await this.stat<{ cnt: number }>({ entity, projection, query, txn });
        return result.cnt;
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

        const { name, options } = source;
        switch (name.toLowerCase()) {
            case 'mysql': {
                this.driver = new MySQLDriver(options, schema2, log);
                break;
            }
            default: {
                throw new Error('暂时不支持的数据源');
            }
        }

        this.addBuiltInColumns();
        this.createDefaultTriggers();
    }

    addBuiltInColumns(): void {
        const { schema } = this;
        Object.keys(schema).forEach(
            (entity) => {
                const { attributes, config, indexes } = schema[entity];

                const foreignKeyColumns = {};
                const foreignKeyIndexes: Index[] = [];
                Object.keys(attributes).forEach(
                    (attr: string) => {
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
                    }
                );
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
                    Object.assign(schema[entity], {
                        indexes: indexes.concat(foreignKeyIndexes),
                    });             
                }
                else {
                    assign(schema[entity], {
                        indexes: foreignKeyIndexes.concat([indexCreateAt, indexUpdateAt]),
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
                let checkNotNull: string[] = [];
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
                            if (uniqueConstraints && uniqueConstraints.length > 0) {
                                for (let uc of uniqueConstraints) {
                                    const uc2 = uc.map(
                                        (c) => {
                                            if (attributes[c].type === 'ref') {
                                                return `${c}Id`;
                                            }
                                            return c;
                                        }
                                    );
                                    const query = pick(data, uc2);
                                    const count = await this.count({ entity, query, txn });
                                    if (count > 0) {
                                        throw ErrorCode.createError(ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${uc.join(',')} of entity ${entity} on insert`);
                                    }
                                }

                            }
                            if (checkNotNull.length > 0) {
                                const nullAttr = checkNotNull.find(
                                    (attr) => data && data[attr] === null
                                );
                                if (nullAttr) {
                                    throw ErrorCode.createError(ErrorCode.notNullConstraintViolated, `not null constraint violated on ${nullAttr} of entity ${entity} on insert`);
                                }
                            }
                            return result;
                        },
                    };
                    this.registerTrigger(trigger);
                }

                if (uniqueConstraints && uniqueConstraints.length > 0) {
                    const name = ` check value when update  ${entity} `;

                    const trigger: Trigger = {
                        name,
                        entity,
                        action: 'update',
                        attributes: union.apply(null, uniqueConstraints) as string[],
                        before: true,
                        fn: async ({ data, row, txn }: {
                            data?: Data,
                            row?: Row,
                            txn?: Txn,
                        }): Promise<number> => {
                            assert(data && row);
                            let result = 0;
                            if (uniqueConstraints && uniqueConstraints.length > 0) {
                                for (let uc of uniqueConstraints) {
                                    const uc2 = uc.map(
                                        (c) => {
                                            if (attributes[c].type === 'ref') {
                                                return `${c}Id`;
                                            }
                                            return c;
                                        }
                                    );
                                    const query = assign(pick(row, uc2), pick(data, uc2));
                                    const count = await this.count({ entity, query, txn });
                                    if (count > 0) {
                                        throw ErrorCode.createError(ErrorCode.uniqueConstraintViolated, `unique constraint violated on ${uc.join(',')} of entity ${entity} on update`);
                                    }
                                    result = result + 1;
                                }

                            }
                            if (checkNotNull.length > 0) {
                                const nullAttr = checkNotNull.map(
                                    (attr) => data && data[attr] === null
                                );
                                if (nullAttr) {
                                    throw ErrorCode.createError(ErrorCode.notNullConstraintViolated, `not null constraint violated on ${nullAttr} of entity ${entity} on update`);
                                }
                            }
                            return result;
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
    async destroy(truncate: boolean = false, excludes?: string[]): Promise<void> {
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

    private async postInsert(entity: string, data: Data, row: Row, txn?: Txn, context?: object) {
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

    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    async create<T>({ entity, data, txn }: {
        entity: string,
        data: Data,
        txn?: Txn,
    }, context?: object): Promise<T> {
        await this.preInsert(entity, data, txn, context);
        const row = await this.driver.create({ entity, data, txn });
        await this.postInsert(entity, data, row, txn, context);

        return row as unknown as T;
    }

    async createMany<T>({ entity, data, txn }: {
        entity: string,
        data: Data[],
        txn?: Txn,
    }, batch?: boolean, context?: object): Promise<T[]> {
        if (batch) {
            for (let d of data) {
                await this.preInsert(entity, d, txn, context);
            }
            const rows = await this.driver.createMany({ entity, data, txn });
            let idx = 0;
            for (let r of rows) {
                await this.postInsert(entity, data[idx++], r, txn, context);
            }
            return rows as unknown as T[];
        }

        const result: Row[] = [];
        for (let d of data) {
            result.push(await this.create({ entity, data: d, txn }));
        }
        return result as unknown as T[];
    }

    /**
     * 同create
     * @param param0 
     */
    async insert<T>({ entity, data, txn }: {
        entity: string,
        data: Data,
        txn?: Txn,
    }, context?: object): Promise<T> {
        return await this.create<T>({ entity, data, txn }, context);
    }

    async insertMany<T>({ entity, data, txn }: {
        entity: string,
        data: Data[],
        txn?: Txn,
    }, batch?: boolean, context?: object): Promise<T[]> {
        return this.createMany<T>({ entity, data, txn }, batch, context);
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

    /**
     * select entity data
     * if there exists some aggregation fncall in projection, please use stat
     * @param param0 
     * @param context 
     */
    async find<T>({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
        sort?: Sort;
    }, context?: object): Promise<T[]> {
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
        const rows: Row[] = await this.driver.find({
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
        return rows as unknown as T[];
    }

    async stat<T>({ entity, projection, query, txn, sort, groupBy }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        txn?: Txn;
        sort?: Sort;
        groupBy?: GroupBy;
    }, context?: object): Promise<T[]> {
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
        const results: Result[] = await this.driver.stat({
            entity,
            projection,
            query: query2,
            groupBy,
            txn,
            sort,
        });
        return results as unknown as T[];
    }


    async findById<T>({ entity, projection, id, txn }: {
        entity: string;
        projection?: Projection;
        id: string | number;
        txn?: Txn;
    }, context?: object): Promise<T> {
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
        return row as unknown as T;
    }

    private async preUpdate(entity: string, data: Data, id?: string | number, row?: Row, txn?: Txn, context?: object): Promise<Row | undefined> {
        const now = Date.now();
        assign(data, {
            $$updateAt$$: now,
        });

        let row2: Row | undefined;

        const possibleTriggers = this.getTriggers({ entity, action: 'update', data, row });
        if (possibleTriggers) {
            if (!row) {
                row2 = await this.findById({ entity, id: id as string | number, txn });
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

        return row2;
    }

    private async postUpdate(entity: string, data: Data, row: Row, txn?: Txn, context?: object): Promise<void> {
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

    async update<T>({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<T> {
        assert(id || row);
        const row2 = await this.preUpdate(entity, data, id, row, txn, context);

        const result = await this.driver.updateById({
            entity,
            data,
            id: (id || (row as Row).id as number),
            txn,
        });

        const rowNow = assign({}, row || row2, data);
        await this.postUpdate(entity, data, rowNow as Row, txn, context);

        return result as unknown as T;
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
        const possibleTriggers = this.getTriggers({ entity, action: 'remove', row });
        if (possibleTriggers) {
            if (!row) {
                row2 = await this.findById({ entity, id: id as string | number, txn });
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
        return {
            deletePhysically,
            row: row || row2,
        };
    }

    private async postRemove(entity: string, row: Row, txn?: Txn, context?: object): Promise<void> {
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

    async remove<T>({ entity, id, row, txn }: {
        entity: string;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<T> {
        const {
            deletePhysically,
            row: row2,
        } = await this.preRemove(entity, id, row, txn, context);

        if (deletePhysically) {
            await this.driver.removeById({ entity, id: (id || (row2 && row2.id)) as string | number, txn });
        }
        else {
            await this.driver.updateById({
                entity, data: {
                    $$deleteAt$$: Date.now(),
                }, id: (id || (row2 && row2.id)) as string | number, txn
            });
        }

        await this.postRemove(entity, row2 as Row, txn, context);

        return (row || { id: id as string | number }) as unknown as T;
    }

    async removeMany({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void> {
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