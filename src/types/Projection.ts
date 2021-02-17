import { FnCall } from './Query';
export interface Projection {
    [attrName: string]: 1 | string | FnCall | Projection;
}