export type ComparisonOperator = '$eq'
    | '$gt'
    | '$gte'
    | '$lt'
    | '$lte'
    | '$ne'
    | '$in'
    | '$nin';


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

export const LogicOperators: string [] = [
    '$and',
    '$nor',
    '$not',
    '$or',
];

export const ComparisonOperators: string[] = [
    '$eq',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$ne',
    '$in',
    '$nin',
];

export const ElementOperators: string[] = [
    '$exists',
];

export const EvaluationOperators: string[] = [
    '$expr',
    '$text',
];

export const SpatialOperators: string[] = [
    '$geoIntersects',
    '$geoWithin',
    '$near',
    '$nearSphere',
    '$box',
    '$center',
    '$centerSphere',
    '$geometry',
    '$maxDistance',
    '$minDistance',
    '$polygon',
];

export const FormatOperators: string[] = [
    '$format',
    '$arguments',
    '$as',
];
