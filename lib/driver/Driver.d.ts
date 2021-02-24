import { ConnectionOptions } from '../source/Source';
import { Schema } from '../Schema';
import { Data, Row } from '../types/Result';
import { Txn, TxnOption } from '../types/Txn';
import { Projection } from '../types/Projection';
import { Query } from '../types/Query';
import { Sort } from '../types/Sort';
import { GroupBy } from '../types/GroupBy';
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export declare abstract class Driver {
    /**
     * Connection options.
     */
    readonly options: ConnectionOptions;
    readonly schema: Schema;
    /**
     * Master database used to perform all write queries.
     *
     * todo: probably move into query runner.
     */
    database?: string;
    constructor(options: ConnectionOptions, schema: Schema);
    /**
     * Performs connection to the database.
     * Depend on driver type it may create a connection pool.
     */
    abstract connect(): Promise<void>;
    /**
     * Closes connection with database and releases all resources.
     */
    abstract disconnect(): Promise<void>;
    abstract init(replace: boolean, excludes?: string[]): Promise<void>;
    abstract destroy(truncate?: boolean, excludes?: string[]): Promise<void>;
    abstract startTransaction(option?: TxnOption): Promise<Txn>;
    abstract commitTransaction(txn: Txn): Promise<void>;
    abstract rollbackTransaction(txn: Txn): Promise<void>;
    abstract getTransactionById(id: string): Txn;
    abstract create({ entity, data, txn }: {
        entity: string;
        data: Data;
        txn?: Txn;
    }): Promise<Row>;
    abstract createMany({ entity, data, txn }: {
        entity: string;
        data: Data[];
        txn?: Txn;
    }): Promise<Row[]>;
    abstract find({ entity, projection, query, indexFrom, count, txn, sort, forUpdate, groupBy }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        indexFrom?: number | undefined;
        count?: number | undefined;
        txn?: Txn | undefined;
        forUpdate?: boolean;
        sort?: Sort;
        groupBy?: GroupBy;
    }): Promise<Row[]>;
    abstract updateById({ entity, data, id, txn }: {
        entity: string;
        data: Data;
        id: string | number;
        txn?: Txn;
    }): Promise<Row>;
    abstract updateByCondition({ entity, data, query, txn }: {
        entity: string;
        data: Data;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
    abstract removeById({ entity, id, txn }: {
        entity: string;
        id: string | number;
        txn?: Txn;
    }): Promise<void>;
    abstract removeByCondition({ entity, query, txn }: {
        entity: string;
        query?: Query;
        txn?: Txn;
    }): Promise<void>;
}
