export type Value = any;

export interface Data {
    [propName: string]: any;
}

export interface Result {
    id: string | number;
    [attribute: string]: any;
}
