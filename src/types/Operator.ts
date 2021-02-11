export type ComparisonOperator = '$eq'
    | '$gt'
    | '$gte'
    | '$lt'
    | '$lte'
    | '$ne'
    | '$in'
    | '$nin'
    | '$exists';


export type LogicOperator = '$and'
    | '$or'
    | '$not'
    | '$nor';

export type ElementOperator = '$exists';

export type EvaluationOperator = '$text'
    | '$expr';

export type SpatialOperator = '$geoIntersects' 
    | '$geoWithin' 
    | '$near'
    | '$nearSphere'
    | '$box'
    | '$center'
    | '$centerSphere'
    | '$geometry'
    | '$maxDistance'
    | '$minDistance'
    | '$polygon';

export type FormatOperator = '$format'
    | '$arguments'
    | '$as';

export type FnCallOperator = '$fnCall';

export const FnCallPrefix = '$fnCall';