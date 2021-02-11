export interface DataTypeParams {
    length?: number;
    width?: number;
    precision?: number;
    scale?: number;
}

export interface DataTypeDefaults {
    [type: string]: DataTypeParams;
}