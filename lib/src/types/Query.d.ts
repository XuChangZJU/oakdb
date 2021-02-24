import { ComparisonOperator, ElementOperator } from '../types/Operator';
export declare type PrimitiveValue = string | number | boolean | object;
export declare type SingleAttrQuery = PrimitiveValue | PrimitiveValue[] | {
    [op in ComparisonOperator]: PrimitiveValue | PrimitiveValue[];
};
export declare type ElementQuery = {
    [op in ElementOperator]: boolean;
};
export interface FnCall {
    $format: string;
    $attrs?: string[];
    $as?: string;
    $omitPrefix?: boolean;
}
export interface FullTextSearchQuery {
    $search: string;
    $language?: 'zh_CN' | 'en_US';
}
export interface GeographicQuery {
}
export interface LogicQuery {
    [op: string]: PlainQuery[] | LogicQuery[];
}
export interface PlainQuery {
    [attrName: string]: SingleAttrQuery | PlainQuery | FnCall | LogicQuery | FullTextSearchQuery;
}
export declare type Query = LogicQuery | PlainQuery;
