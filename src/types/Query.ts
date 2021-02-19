import {
    ComparisonOperator,
    LogicOperator,
    ElementOperator,
    EvaluationOperator,
    SpatialOperator,
    FnCallOperator,
} from '../types/Operator';

// 单个属性的取值
export type PrimitiveValue = string | number | boolean | object;

// 单个属性带比较算子取值
export type SingleAttrQuery = PrimitiveValue | PrimitiveValue [] | {
    [op in ComparisonOperator]: PrimitiveValue | PrimitiveValue[];
};

export type ElementQuery = {
    [op in ElementOperator]: boolean;
}

export interface FnCall {
    $format: string,
    $attrs?: string[];
    $as?: string;
    $omitPrefix?: boolean;
};

export interface FullTextSearchQuery {
    $search: string;
    $language?: 'zh_CN' | 'en_US';
};

// todo
export interface GeographicQuery {
    
}


export interface LogicQuery {
    [op: string]: PlainQuery[] | LogicQuery[];
};

export interface PlainQuery {
    [attrName: string]: SingleAttrQuery | PlainQuery | FnCall | LogicQuery | FullTextSearchQuery;
}

export type Query = LogicQuery | PlainQuery;


