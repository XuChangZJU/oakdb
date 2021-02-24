import { Translator } from './Translator';
import { Data, Value } from '../types/Result';
import { DataType } from '../DataType';
import { Projection } from '../types/Projection';
import { FullTextSearchQuery, Query } from '../types/Query';
import { TranslateResult } from './translate-result/TranslateResult';
import { Sort } from '../types/Sort';
import { GroupBy } from '../types/GroupBy';
export declare abstract class SqlTranslator extends Translator {
    translateDestroyEntity(entity: string, truncate?: boolean): string;
    abstract translateAttrProjection(dataType: DataType, alias: string, attr: string): string;
    abstract translateAttrValue(dataType: DataType, value: Value | Data): string;
    abstract translateFullTextSearch(value: FullTextSearchQuery, entity: string, alias: string): string;
    abstract translateIndexFromCount(indexFrom: number, count: number): string;
    abstract translateForUpdate(): string;
    translateInsertRow(entity: string, data: Data[]): string;
    private getDefaultProjection;
    /**
     * analyze the join relations in projection/query/sort
     * @param param0
     */
    private analyzeJoin;
    private translateFnCall;
    private translateComparison;
    private translateElement;
    private translateEvaluation;
    /**
     * check the attribute in sort exists in projection
     * @param entity
     * @param projection
     * @param sort
     */
    private checkSortWithProjection;
    translateProjection(entity: string, projection: Projection, aliasDict: {
        [propName: string]: string;
    }): string;
    translateGroupBy(entity: string, groupBy: GroupBy, aliasDict: {
        [propName: string]: string;
    }): string;
    translateWhere(entity: string, query: Query, aliasDict: {
        [propName: string]: string;
    }): string;
    translateSort(entity: string, sort: Sort, aliasDict: {
        [propName: string]: string;
    }): string;
    translateSelect({ entity, projection, query, indexFrom, count, sort, forUpdate, groupBy }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        indexFrom?: number | undefined;
        count?: number | undefined;
        forUpdate?: boolean | undefined;
        sort?: Sort;
        groupBy?: GroupBy;
    }): TranslateResult;
    /**
     * update table t1 set t1.a1 = v1 where (id = 1)/(t1.a2 = v2);
     * @param param0
     */
    translateUpdate({ entity, data, id, query }: {
        entity: string;
        data: Data;
        id?: string | number;
        query?: Query;
    }): string;
    translateRemove({ entity, id, query }: {
        entity: string;
        id?: string | number;
        query?: Query;
    }): TranslateResult;
}
