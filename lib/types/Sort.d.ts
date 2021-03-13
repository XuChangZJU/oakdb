import { FnCall } from "./Query";
export interface SortAttr {
    [attrName: string]: 1 | string | SortAttr | FnCall;
}
export interface SortNode {
    $attr: SortAttr;
    $direction?: 'asc' | 'desc';
}
export declare type Sort = SortNode[];
