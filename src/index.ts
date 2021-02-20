import { assign, cloneDeep, pick } from 'lodash';
import { Index, Schema } from './Schema';
import { Source } from './source/Source';
import { Data, Result, Row } from './types/Result';
import { Txn, TxnOption } from './types/Txn';

//
import { Driver } from './driver/Driver';
import {MySQL as MySQLDriver } from './driver/MySQL';
import { Trigger, Warden } from './warden';
import { Projection } from './types/Projection';
import { Query } from './types/Query';
import { serialUuid } from './utils';
import { ErrorCode } from './errorCode';
import { Sort } from './types/Sort';
import { GroupBy } from './types/GroupBy';

export class OakDb extends Warden {
    count({ entity, query, txn }: { entity: string; query?: Query | undefined; txn?: Txn | undefined; }): Promise<number> {
        throw new Error('Method not implemented.');
    }
    updateById({ entity, data, id, txn }: { entity: string; data: Data; id: string | number; txn?: Txn | undefined; }): Promise<Row> {
        throw new Error('Method not implemented.');
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
    }): Promise<Row[]> {
        return await this.driver.find({
            entity,
            projection,
            query,
            indexFrom,
            count,
            txn,
            forUpdate,
            sort,
            groupBy,
        });
    }
    findById({ entity, projection, id, txn }: { entity: string; projection?: Projection | undefined; id: string | number; txn?: Txn | undefined; }): Promise<Row> {
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
                            data: Data,
                            txn?: Txn,
                        }): Promise<number> => {
                            let result = 0;
                            if (createUuid && !data.$$uuid$$) {
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

    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    async create({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }): Promise<Result> {
        const now = Date.now();
        assign(data, {
            $$createAt$$: now,
            $$updateAt$$: now,
        });

        const triggers = this.getTriggers({ entity, action: 'insert', data });
        if (txn && triggers) {
            // 处理插入前trigger
            const beforeTriggers = triggers.filter(
                ({ before }) => before
            );
            if (beforeTriggers.length > 0) {
                await this.execTriggers({
                    triggers: beforeTriggers,
                    data,
                    txn,
                });
            }
        }
        const row = await this.driver.create({ entity, data, txn });
        if (txn && triggers) {
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
                });
            }
        }

        return row;
    }

    /**
     * 同create
     * @param param0 
     */
    async insert({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }): Promise<Result> {
        return await this.create({ entity, data, txn });
    }


}