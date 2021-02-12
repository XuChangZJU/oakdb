import { Driver } from './Driver';
import { ConnectionOptions } from '../source/Source';
import { DataType } from '../DataType';
import { DataTypeDefaults, DataTypeParams } from '../DataTypeDefaults';
import { Schema, Attribute, Column, Index } from '../Schema';
import { Data, Result, Value } from '../types/Result';
import { Txn, TxnOption } from '../types/Txn';
import { MySQLTranslator } from '../translator/MySQLTranslator';
import assert from 'assert';
import { v4 } from 'uuid';
import { assign, unset } from 'lodash';

export class MySQL extends Driver {
    mysql: any;

    debug: boolean = false;

    connectionPool: any;

    transactions: any;
    
    readonly translator: MySQLTranslator;

    constructor(options: ConnectionOptions, schema: Schema) {
        super(options, schema);
        const { database } = options;
        this.database = database;
        this.mysql = require('mysql');
        this.addForeignKeyColumns(this.schema);
        this.translator = new MySQLTranslator(this, this.schema);
        this.transactions = {};
    }

    /**
     * 为所有的ref类型创建`${ref}Id`列，并创建外键的索引
     */
    private addForeignKeyColumns(schema: Schema) {
        Object.keys(schema).forEach(
            (entity: string) => {
                const foreignKeyColumns = {};
                const { attributes, indexes } = schema[entity];
                const foreignKeyIndexes: Index[] = [];
                Object.keys(attributes).forEach(
                    (attr: string) => {
                        const { type } = attributes[attr];
                        if (type === 'ref') {
                            Object.assign(foreignKeyColumns, {
                                [`${attributes[attr].ref}Id`]: {
                                    type: 'bigint',
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
                    'id': {
                        type: 'bigint',
                        notNull: true,
                        display: {
                            header: '主键',
                            weight: 200,
                        },
                    },
                });
                if (!indexes) {
                    assert(false);  // 有createAt和updateAt，应该跑不到这里
                    Object.assign(schema[entity], {
                        indexes: foreignKeyIndexes,
                    });
                }
                else {
                    Object.assign(schema[entity], {
                        indexes: indexes.concat(foreignKeyIndexes),
                    });                    
                }                
            }
        );
    }

    async connect(): Promise<void> {
        this.connectionPool = await this.mysql.createPool(this.options);
    }

    async disconnect(): Promise<void> {
        await this.connectionPool.end();
    }

    async exec(sql: string, txn?: Txn): Promise<any> {
        console.log(sql);
        if (txn) {
            const connection = this.transactions[txn];
            
            return await new Promise(
                (resolve, reject) => {
                    connection.query(sql, (err: Error, result: any, fields: any) => {
                        if (err) {
                            return reject(err);
                        }
    
                        return resolve(result);
                    })
                }
            );
        }
        return await new Promise(
            (resolve, reject) => {
                // if (process.env.DEBUG) {
                //  console.log(sql);
                //}
                this.connectionPool.query(sql, (err: Error, result: any, fields: any) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(result);
                })
            }
        );
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

                            const txn = v4();
                            assign(this.transactions, {
                                [txn]: connection,
                            });

                            return txn;
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
        const connection = this.transactions[txn];

        return await new Promise(
            (resolve, reject) => {
                connection.query('COMMIT;', (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    connection.releases();
                    unset(this.transactions, txn);
                    resolve();
                });
            }
        );
    }


    async rollbackTransaction(txn: Txn): Promise<void> {
        const connection = this.transactions[txn];

        return await new Promise(
            (resolve, reject) => {
                connection.query('ROLLBACK;', (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    connection.releases();
                    unset(this.transactions, txn);
                    resolve();
                });
            }
        );
    }

   
    async create({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }): Promise<Result> {
        const entityDef = this.schema[entity];
        const { attributes } = entityDef;
        
        const sql = this.translator.translateInsertRow(entity, data);

        return await this.exec(sql);
    }
}