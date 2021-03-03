import { DataType } from './DataType';
import { DataTypeParams } from './DataTypeDefaults';
export declare type ref = 'ref';
export interface Column {
    name: string;
    size?: number;
    direction?: 'ASC' | 'DESC';
}
export interface IndexConfig {
    unique?: boolean;
    type?: 'fulltext' | 'btree' | 'hash' | 'spatial';
    parser?: 'ngram';
}
export interface Index {
    name: string;
    columns: Column[];
    unique?: boolean;
    config?: IndexConfig;
}
export interface Attribute {
    type: DataType | 'ref';
    params?: DataTypeParams;
    ref?: string;
    default?: string | number | boolean;
    unique?: boolean;
    notNull?: boolean;
}
export interface Attributes {
    [attrName: string]: Attribute;
}
export interface EntityConfig {
    hasUuid?: boolean;
    removePhysically?: boolean;
}
export interface Entity {
    title: string;
    storageName?: string;
    comment?: string;
    attributes: Attributes;
    uniqConstrants?: string[][];
    indexes?: Index[];
    config?: EntityConfig;
}
export interface Schema {
    [propName: string]: Entity;
}
