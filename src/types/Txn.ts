import EventEmitter from "events";
import { identity } from "lodash";

export class Txn extends EventEmitter {
    id: string;
    data: any;

    constructor(id: string, data: any) {
        super();
        this.id = id;
        this.data = data;
    }
}

export interface TxnOption {
    isolationLevel: 'serializable' | 'repeatable read' | 'read committed',
    readonly?: boolean,
}
