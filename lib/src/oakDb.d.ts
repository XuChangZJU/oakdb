import { Schema } from './Schema';
import { Source } from './source/Source';
import { Data, Row } from './types/Result';
import { Txn, TxnOption } from './types/Txn';
import { Driver } from './driver/Driver';
import { Warden } from './warden';
import { Projection } from './types/Projection';
import { Query } from './types/Query';
import { Sort } from './types/Sort';
import { GroupBy } from './types/GroupBy';
export declare class OakDb extends Warden {
    count({ entity, query, txn }: {
        entity: string;
        query?: Query | undefined;
        txn?: Txn | undefined;
    }): Promise<number>;
    schema: Schema;
    source: Source;
    driver: Driver;
    static builtInColumnNames: string[];
    constructor(schema: Schema, source: Source, log?: (message: string) => void);
    addBuiltInColumns(): void;
    createDefaultTriggers(): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * 初始化对象结构
     */
    init(replace?: boolean, excludes?: string[]): Promise<void>;
    /**
     * 销毁对象结构
     * @param truncate
     * @param excludes
     */
    destroy(truncate?: boolean, excludes?: string[]): Promise<void>;
    startTransaction(option?: TxnOption): Promise<Txn>;
    commitTransaction(txn: Txn): Promise<void>;
    rollbackTransaction(txn: Txn): Promise<void>;
    private preInsert;
    private postInsert;
    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    create({ entity, data, txn }: {
        entity: string;
        data: Data;
        txn?: Txn;
    }): Promise<Row>;
    createMany({ entity, data, txn }: {
        entity: string;
        data: Data[];
        txn?: Txn;
    }, batch?: boolean): Promise<Row[]>;
    /**
     * 同create
     * @param param0
     */
    insert({ entity, data, txn }: {
        entity: string;
        data: Data;
        txn?: Txn;
    }): Promise<Row>;
    insertMany({ entity, data, txn }: {
        entity: string;
        data: Data[];
        txn?: Txn;
    }, batch?: boolean): Promise<Row[]>;
    addDeleteAtColumnCheck(query: Query, entity: string): void;
    find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate, groupBy }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
        sort?: Sort;
        groupBy?: GroupBy;
    }): Promise<Row[]>;
    findById({ entity, projection, id, txn }: {
        entity: string;
        projection?: Projection;
        id: string | number;
        txn?: Txn;
    }): Promise<Row>;
    private preUpdate;
    private postUpdate;
    update({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }): Promise<Row>;
    updateMany({ entity, data, query, txn }: {
        entity: string;
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
    private preRemove;
    private postRemove;
    remove({ entity, id, row, txn }: {
        entity: string;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }): Promise<Row>;
    removeMany({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
}
