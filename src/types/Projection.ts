import { ComparisonOperator, FormatOperator } from './Operator';

export interface Projection {
    [attrName: string]: 1 | string | {
        $format: string;
        $arguments?: string[];
        $as?: string;
    } | Projection;
}