// import {QueryRunner} from "../query-runner/QueryRunner";
import cloneDeep from 'lodash/cloneDeep';
import { ConnectionOptions } from '../source/Source';
import { Schema } from '../Schema';
import { Data, Result } from '../types/Result';
import { Txn, TxnOption } from '../types/Txn';

/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export abstract class Driver {

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


    constructor(options: ConnectionOptions, schema: Schema) {
        this.options = options;
        this.schema = cloneDeep(schema);
    }

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

    
    // abstract upgrade(oldSchema: Schema): Promise<void>;


    abstract startTransaction(option?: TxnOption): Promise<Txn>;


    abstract commitTransaction(txn: Txn): Promise<void>;

    
    abstract rollbackTransaction(txn: Txn): Promise<void>


    abstract getTransactionById(id: string): Txn


    abstract create({ entity, data, txn }:{
        entity: string,
        data: Data,
        txn?: Txn,
    }): Promise<Result>;
}
