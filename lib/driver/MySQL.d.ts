import { Driver } from './Driver';
import { ConnectionOptions } from '../source/Source';
import { PrimaryGeneratedColumnType } from '../DataType';
import { Schema } from '../Schema';
import { Data, Result, Row } from '../types/Result';
import { Txn, TxnOption } from '../types/Txn';
import { MySQLTranslator } from '../translator/MySQLTranslator';
import { Projection } from '../types/Projection';
import { Query } from '../types/Query';
import { Sort } from '../types/Sort';
import { GroupBy } from '../types/GroupBy';
export declare class MySQL extends Driver {
    mysql: any;
    debug: boolean;
    connectionPool: any;
    transactions: {
        [propName: string]: Txn;
    };
    readonly translator: MySQLTranslator;
    constructor(options: ConnectionOptions, schema: Schema);
    getPrimaryKeyType(): PrimaryGeneratedColumnType;
    /**
     * 为所有的ref类型创建`${ref}Id`列，并创建外键的索引
     */
    private addForeignKeyColumns;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    unfoldResult(entity: string, result: Result | Result[]): Result | Result[];
    static ERR_DICT: {
        [name: string]: number;
    };
    translateToOakError(err: {
        errno: number;
        sqlMessage: string;
    }): Error;
    exec(sql: string, txn?: Txn): Promise<any>;
    init(replace: boolean, excludes?: string[]): Promise<void>;
    destroy(truncate?: boolean, excludes?: string[]): Promise<void>;
    startTransaction(option?: TxnOption): Promise<Txn>;
    commitTransaction(txn: Txn): Promise<void>;
    rollbackTransaction(txn: Txn): Promise<void>;
    getTransactionById(id: string): Txn;
    create({ entity, data, txn }: {
        entity: string;
        data: Data;
        txn?: Txn;
    }): Promise<Row>;
    createMany({ entity, data, txn }: {
        entity: string;
        data: Data[];
        txn?: Txn;
    }): Promise<Row[]>;
    find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        sort?: Sort;
        forUpdate?: boolean;
    }): Promise<Row[]>;
    stat({ entity, projection, query, txn, groupBy, sort }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        txn?: Txn | undefined;
        groupBy?: GroupBy;
        sort?: Sort;
    }): Promise<Result[]>;
    updateById({ entity, data, id, txn }: {
        entity: string;
        data: Data;
        id: string | number;
        txn?: Txn;
    }): Promise<Row>;
    updateByCondition({ entity, data, query, txn }: {
        entity: string;
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
    removeById({ entity, id, txn }: {
        entity: string;
        id: string | number;
        txn?: Txn;
    }): Promise<void>;
    removeByCondition({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
}
