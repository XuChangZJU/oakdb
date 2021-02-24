/// <reference types="node" />
import EventEmitter from "events";
export declare class Txn extends EventEmitter {
    id: string;
    data: any;
    constructor(id: string, data: any);
}
export interface TxnOption {
    isolationLevel: 'serializable' | 'repeatable read' | 'read committed';
    readonly?: boolean;
}
