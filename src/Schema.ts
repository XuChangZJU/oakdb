import { DataType } from './DataType';
import { DataTypeParams } from './DataTypeDefaults';
export type ref = 'ref';

export interface Column {
    name: string,
    size?: number,
    direction?: 'ASC' | 'DESC',
}

export interface IndexConfig {
    unique?: boolean;
    type?: 'fulltext'|'btree'|'hash'|'spatial';
    parser?: 'ngram';
}

export interface Index {
    name: string;
    columns: Column[];
    unique?: boolean;
    config?: IndexConfig;
}

export interface Display {
    icon?: string;
    header: string;
    weight?: number;
}

export interface Attribute {
    type: DataType | 'ref';
    params?: DataTypeParams;
    ref?: string;
    default?: string | number | boolean;
    unique?: boolean;
    notNull?: boolean;
    display: Display;
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
    storageName?: string,
    comment?: string,
    icon?: string;
    attributes: Attributes;
    indexes?: Index[];
    config?: EntityConfig;
}

export interface Schema {
    [propName: string]: Entity;
}
