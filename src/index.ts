import { assign } from 'lodash';
import { Index, Schema } from './Schema';
import { Source } from './source/Source';

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
     * 初始化schema中的对象结构
     */
    async init(replace: boolean = false, excludes?: string[]): Promise<void> {
        return await this.driver.init(replace, excludes);
    }

    async destroy(truncate: boolean = false, excludes?:string[]): Promise<void> {
        return await this.driver.destroy(truncate, excludes);
    }

}