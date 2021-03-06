import { FnCall } from './Query';
export declare type ProjectionValue = 1 | string | FnCall | Projection;
export interface Projection {
    [attrName: string]: ProjectionValue;
}
