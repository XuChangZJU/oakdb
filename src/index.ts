import { assign } from 'lodash';
import { Index, Schema } from './Schema';
import { Source } from './source/Source';
import { Data, Result } from './types/Result';
import { Txn, TxnOption } from './types/Txn';

//
import { Driver } from './driver/Driver';
import {MySQL as MySQLDriver } from './driver/MySQL';

export class OakDb {        
    schema: Schema;
    source: Source;
    driver: Driver;

    static builtInColumnNames = ['$$createAt$$', '$$updateAt$$', '$$deleteAt$$', 'id', '$$uuid$$'];

    constructor(schema: Schema, source: Source) {
        this.schema = schema;
        this.source = source;
        this.addBuiltInColumns();

        const { name, options } = source;
        switch (name.toLowerCase()) {
            case 'mysql': {
                this.driver = new MySQLDriver(options, schema);
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
        )
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

    async startTransaction(option: TxnOption): Promise<Txn> {
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
        if (txn) {
            // 处理插入前trigger
        }
        const result = this.driver.create({ entity, data, txn });
        if (txn) {
            // 处理插入后trigger
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
    }): Promise<Result> {
        return await this.create({ entity, data, txn });
    }


}