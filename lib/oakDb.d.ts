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
    create<T extends Data>({ entity, data, txn }: {
        entity: string;
        data: T;
        txn?: Txn;
    }, context?: object): Promise<T & Row>;
    createMany<T extends Data>({ entity, data, txn }: {
        entity: string;
        data: T[];
        txn?: Txn;
    }, batch?: boolean, context?: object): Promise<(Row & T)[]>;
    /**
     * 同create
     * @param param0
     */
    insert<T extends Data>({ entity, data, txn }: {
        entity: string;
        data: T;
        txn?: Txn;
    }, context?: object): Promise<Row & T>;
    insertMany<T extends Row>({ entity, data, txn }: {
        entity: string;
        data: T[];
        txn?: Txn;
    }, batch?: boolean, context?: object): Promise<T[]>;
    addDeleteAtColumnCheck(query: Query, entity: string): void;
    /**
     * select entity data
     * if there exists some aggregation fncall in projection, please use stat
     * @param param0
     * @param context
     */
    find<T extends Row>({ entity, projection, query, indexFrom, count, txn, sort, forUpdate }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
        sort?: Sort;
    }, context?: object): Promise<T[]>;
    stat<T>({ entity, projection, query, txn, sort, groupBy }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        txn?: Txn;
        sort?: Sort;
        groupBy?: GroupBy;
    }, context?: object): Promise<T[]>;
    findById<T>({ entity, projection, id, txn }: {
        entity: string;
        projection?: Projection;
        id: string | number;
        txn?: Txn;
    }, context?: object): Promise<Row & T>;
    private preUpdate;
    private postUpdate;
    update<T extends Row>({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<T>;
    updateMany({ entity, data, query, txn }: {
        entity: string;
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
    private preRemove;
    private postRemove;
    remove<T extends Row>({ entity, id, row, txn }: {
        entity: string;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<T>;
    removeMany({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
    judgeRelation(entity: string, attr: string): any;
}
/**
 * @description judge relation of attr to entity
 * @param entity
 * @param attr
 * @returns {
    *      1: ownAttribute,
    *      string: many-to-one,
    *      2: many-to-one(using entity/entityId pointer)
    *      []: one-to-many(using entity as attribute name)
    *      {}: one-to-many(using entity/entityId)
    * }
    */
export declare function judgeRelation(entity: string, attr: string, schema: Schema): any;
