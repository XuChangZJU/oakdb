export type Value = any;

export interface Data {
    [propName: string]: any;
}

export interface Row {
    id: string | number;
    [attribute: string]: any;
}

export type Result = Row | Data;
