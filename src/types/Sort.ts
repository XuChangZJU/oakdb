export interface SortAttr {
    [attrName : string]: 1 | string | SortAttr,
};

export interface SortNode {
    $attr: SortAttr;
    $direction: 'asc' | 'desc';
};

export type Sort = SortNode[];
