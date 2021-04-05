import { Data, Row } from './types/Result';
import { Projection } from './types/Projection';
import { Txn, TxnOption } from './types/Txn';
import { Query } from './types/Query';
import { Schema } from './Schema';
declare type Action = 'insert' | 'create' | 'update' | 'remove' | 'delete' | 'read' | 'select';
export interface TriggerInput {
    row?: Row;
    data?: Data;
    txn?: Txn;
    triggeredRow?: Row;
    triggeredRows?: Row[];
}
export interface Trigger {
    name: string;
    entity: string;
    action: Action;
    before?: boolean;
    valueCheck?: ({ row, data }: {
        row?: Row;
        data?: Data;
    }) => boolean;
    attributes?: string | string[];
    fn: (triggerInput: TriggerInput, context?: object) => Promise<any>;
    triggerEntity?: string;
    triggerProjection?: Projection;
    triggerCondition?: ({ row, data, txn }: {
        row?: Row;
        data?: Data;
        txn?: Txn;
    }) => Promise<Query>;
    group?: boolean;
    volatile?: 'makeSure' | 'takeEasy';
}
export declare abstract class Warden {
    static builtInColumnNames: string[];
    private triggerActionStore;
    private triggerNameStore;
    private log;
    static ActionAlias: {
        insert: string;
        create: string;
        update: string;
        remove: string;
        delete: string;
        read: string;
        select: string;
    };
    constructor(schema: Schema, log?: (message: string) => void);
    /**
     * register one trigger
     * @param trigger
     */
    registerTrigger(trigger: Trigger): void;
    protected getTriggers({ entity, action, data, row }: {
        entity: string;
        action: Action;
        data?: Data;
        row?: Row;
    }): Trigger[] | void;
    abstract update({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<Row>;
    abstract find({ entity, projection, query, indexFrom, count, forUpdate, txn }: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
    }, context?: object): Promise<Row[]>;
    abstract startTransaction(option?: TxnOption): Promise<Txn>;
    abstract commitTransaction(txn: Txn): Promise<void>;
    abstract rollbackTransaction(txn: Txn): Promise<void>;
    private getCount;
    private doTrigger;
    private doTriggerAgain;
    protected execTriggers({ triggers, row, data, txn, context }: {
        triggers: Trigger[];
        row?: Row;
        data?: Data;
        txn?: Txn;
        context?: object;
    }): Promise<void>;
    /**
     * find the volatile triggers are not done properly, then do them again.
     * @params interval: delay(millisecond) for the volatile triggers will be executed.
     */
    patrol(interval?: number, context?: object): Promise<void>;
}
export {};
