export type Txn = string;

export interface TxnOption {
    isolationLevel: 'serializable' | 'repeatable read' | 'read committed',
    readonly?: boolean,
}
