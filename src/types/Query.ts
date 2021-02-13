import {
    ComparisonOperator,
    LogicOperator,
    ElementOperator,
    EvaluationOperator,
    SpatialOperator,
    FnCallOperator,
} from '../types/Operator';

// 单个属性的取值
export type PrimitiveValue = string | number | boolean;

// 单个属性带比较算子取值
export type SingleAttrQuery = PrimitiveValue | PrimitiveValue [] | {
    ComparisonOperator: PrimitiveValue | PrimitiveValue[];
    ElementOperator: boolean;
};

export interface FnCallQuery {
    $fnCall: {
        $format: string,
        $arguments?: string[];        
    };
}

export interface FullTextSearchQuery {
    $text: {
        $search: string;
        $language?: 'zh_CN';
    };
}

export interface GeographicQuery {
    
}

// 多个属性组成的对象式算子取值
export interface PlainQuery {
    [attrName: string]: SingleAttrQuery | PlainQuery;    
}

export interface ElementQuery {

}

export interface Query {
    
}

export interface LogicQuery {
    LogicOperator: PlainQuery | LogicQuery
}

