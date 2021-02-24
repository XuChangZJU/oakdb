export declare type Value = any;
export interface Data {
    [propName: string]: any;
}
export interface Row {
    id: string | number;
    [attribute: string]: any;
}
export declare type Result = Row;
