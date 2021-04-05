import util from 'util';
import { Translator } from './Translator';
import { Data, Value } from '../types/Result';
import { DataType } from '../DataType';
import { Projection } from '../types/Projection';
import { FnCall, FullTextSearchQuery, LogicQuery, PlainQuery, PrimitiveValue, Query } from '../types/Query';
import { ComparisonOperator, ComparisonOperators, ElementOperator, ElementOperators, EvaluationOperator, EvaluationOperators, LogicOperator, LogicOperators, SpatialOperators } from '../types/Operator';
import { TranslateResult } from './translate-result/TranslateResult';
import { assign, merge, unset } from 'lodash';
import { Sort, SortAttr, SortNode } from '../types/Sort';
import { assert } from 'console';
import { ErrorCode } from '../errorCode';
import { GroupBy } from '../types/GroupBy';

export abstract class SqlTranslator extends Translator {
    translateDestroyEntity(entity: string, truncate?: boolean):string {
        const { schema } = this;
        const { storageName = entity } = schema[entity];
        
        const sql = truncate ? `truncate table ${storageName}`: `drop table if exists ${storageName}`;

        return sql;
    }

    abstract translateAttrProjection(dataType: DataType, alias: string, attr: string): string;

    abstract translateAttrValue(dataType: DataType, value: Value | Data ): string;

    abstract translateFullTextSearch(value: FullTextSearchQuery, entity: string, alias: string): string;

    abstract translateIndexFromCount(indexFrom: number, count: number): string;

    abstract translateForUpdate(): string;

    translateInsertRow(entity: string, data: Data[]): string {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];
        
        let sql = `insert into \`${storageName}\`(`;

        const attrs = Object.keys(data[0]);
        attrs.forEach(
            (attr, idx) => {
                sql += ` \`${attr}\``;
                if (idx < Object.keys(data[0]).length - 1) {
                    sql += ',';
                }
            }
        );

        sql += ') values ';

        data.forEach(
            (d, dataIndex) => {
                sql += '(';
                attrs.forEach(
                    (attr, attrIdx) => {
                        const attrDef = attributes[attr];
                        const { type: dataType } = attrDef;
                        const value = this.translateAttrValue(dataType as DataType, d[attr] as Value);
                        sql += value;
                        if (attrIdx < attrs.length - 1) {
                            sql += ',';
                        }
                    }
                );
                sql += ')';
                if (dataIndex < data.length - 1) {
                    sql += ',';
                }
            }
        );

        return sql;
    }

    private formalizeProjection(entity: string, projection?: Projection, noExpand?:boolean): Projection {        
        const projection2: Projection = projection || {};
        const { schema } = this;

        const { attributes } = schema[entity];

        Object.keys(attributes).forEach(
            (attr) => {
                if (!attr.match(/\$\$[\d|\D]+\$\$$/)) {     // omit metadata by default
                    const { type } = attributes[attr];
                    if (type === 'ref') {
                        if (!noExpand &&( !projection || projection[attr] || projection.hasOwnProperty('$all'))) {
                            const { ref } = attributes[attr];
                            const projection3 = this.formalizeProjection(ref as string, projection && (projection[attr] as Projection), true);
                            assign(projection2, {
                                [attr]: projection3,
                            });
                        }
                    }
                    else if (!projection || projection.hasOwnProperty('$all')) {
                        assign(projection2, {
                            [attr]: 1,
                        });
                    }
                }
            }
        );
        unset(projection2, '$all');

        return projection2;
    }

    /**
     * analyze the join relations in projection/query/sort
     * @param param0 
     */
    private analyzeJoin({ entity, projection, query, sort }: {
        entity: string;
        projection: Projection;
        query?: Query;
        sort?: Sort;
    }): {
        aliasDict: {
            [path: string]: string,
        },
        from: string,
    } {
        const { schema } = this;
        let count = 1;

        const getStorageName = (entity: string): string => {
            const { storageName } = schema[entity];
            return storageName || entity;
        };
        const alias = `${entity}_${count ++}`;
        let from = ` \`${getStorageName(entity)}\` \`${alias}\` `;
        const aliasDict: {
            [propName: string]: string,
        } = {
            './': alias,
        };

        const analyzeQueryNode = ({ node, path, entityName, alias }: {
            node: Query;
            path: string;
            entityName: string;
            alias: string,
        }): void => {
            const { attributes } = schema[entityName];
            Object.keys(node).forEach(
                (op) => {
                    if (LogicOperators.includes(op)) {
                        (node[op] as PlainQuery[] | LogicQuery[]).forEach(
                            (subNode: PlainQuery | LogicQuery) => analyzeQueryNode({
                                node: subNode,
                                path,
                                entityName,
                                alias,
                             })
                        );
                    }
                    else if (attributes[op] && attributes[op].type === 'ref') {
                        const { ref } = attributes[op];
                        const pathAttr = `${path}${op}/`;
                        let alias2;
                        if (!aliasDict.hasOwnProperty(pathAttr)) {
                            alias2 = `${ref}_${count++}`;
                            assign(aliasDict, {
                                [pathAttr]: alias2,
                            });
                            from += ` inner join \`${getStorageName(ref as string)}\` \`${alias2}\` on \`${alias}\`.\`${op}Id\` = \`${alias2}\`.\`id\``;
                        }
                        else {
                            alias2 = aliasDict[pathAttr];
                        }
                        analyzeQueryNode({
                            node: node[op] as Query,
                            path: pathAttr,
                            entityName: ref as string,
                            alias: alias2,
                         });
                    }
                }
            )
        };
        if (query) {
            analyzeQueryNode({
                node: query,
                path: './',
                entityName: entity,
                alias,
            });
        }

        const analyzeSortNode = ({ attr, node, path, entityName, alias }: {
            attr: string;
            node: 1 | SortAttr | string | FnCall;
            path: string;
            entityName: string;
            alias: string;
        }): void => {
            const { attributes } = schema[entityName];
            if (typeof node === 'object' && attributes[attr] && (attributes[attr].type === 'ref')) {
                const { ref } = attributes[attr];
                const pathAttr = `${path}${attr}/`;
                let alias2;
                if (!aliasDict.hasOwnProperty(pathAttr)) {
                    alias2 = `${ref}_${count++}`;
                    assign(aliasDict, {
                        [pathAttr]: alias2,
                    });
                    from += ` inner join \`${getStorageName(ref as string)}\` \`${alias2}\` on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
                }
                else {
                    alias2 = aliasDict[pathAttr];
                }
                const nodeAttr = Object.keys(node)[0];
                analyzeSortNode({
                    attr: nodeAttr,
                    node: (node as SortAttr)[nodeAttr],
                    path: pathAttr,
                    entityName: ref as string,
                    alias: alias2,
                });
            }
        }
        if (sort) {
            sort.forEach(
                (sortNode) => {
                    const { $attr } = sortNode;
                    if (typeof $attr !== 'string') {
                        const attr = Object.keys($attr)[0];
                        analyzeSortNode({ attr, node: $attr[attr], path: './', entityName: entity, alias });
                    }
                }
            );
        }

        const analyzeProjectionNode = ({ node, path, entityName, alias }: {
            node: Projection;
            path: string;
            entityName: string;
            alias: string;
        }): void => {
            const { attributes } = schema[entityName];
            Object.keys(node).forEach(
                (attr) => {
                    if (attributes[attr] && attributes[attr].type === 'ref') {
                        const { ref } = attributes[attr];
                        const pathAttr = `${path}${attr}/`;

                        let alias2;
                        if (!aliasDict.hasOwnProperty(pathAttr)) {
                            alias2 = `${ref}_${count++}`;
                            assign(aliasDict, {
                                [pathAttr]: alias2,
                            });
                            from += ` left join \`${getStorageName(ref as string)}\` \`${alias2}\` on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
                        }
                        else {
                            alias2 = aliasDict[pathAttr];
                        }
                        analyzeProjectionNode({
                            node: node[attr] as Projection,
                            path: pathAttr,
                            entityName: ref as string,
                            alias: alias2,
                         });
                    }
                }
            );
        };

        analyzeProjectionNode({ node: projection, path: './', entityName: entity, alias });


        return {
            aliasDict,
            from,
        };
    }

    private translateFnCall(fnCall: FnCall, alias: string, prefix?: string): string {
        const { $format, $attrs, $as, $omitPrefix } = fnCall;

        let result = '';
        const attrs = $attrs ? $attrs.map(
            (ele) => {
                return ` \`${alias}\`.\`${ele}\``;
            }
        ): [];
        const args = [$format].concat(attrs);
        result += ` ${util.format.apply(null, args)}`;
        if ($as) {
            if ($omitPrefix) {
                result += ` as ${$as}`;
            }
            else {
                result += ` as \`${prefix}${$as}\``;
            }
        }

        return result;
    }

    private translateComparison(attr: ComparisonOperator, value: PrimitiveValue, type: DataType): string {
        const SQL_OP: {
            [op: string]: string,
        } = {
            $gt: '>',
            $lt: '<',
            $gte: '>=',
            $lte: '<=',
            $eq: '=',
            $ne: '<>',
            $like: 'like',
        };

        return ` ${SQL_OP[attr]} ${this.translateAttrValue(type, value)}`;
    }

    private translateElement(attr: ElementOperator, value: boolean): string {
        assert(attr === '$exists');      // only support one operator now
        if (value) {
            return ' is not null';
        }
        return ' is null';
    }

    private translateEvaluation(attr: EvaluationOperator ,value: any, entity: string, alias: string, type: DataType): string {
        switch(attr) {
            case '$text': {
                // fulltext search
                return this.translateFullTextSearch(value as FullTextSearchQuery, entity, alias);
            }
            case '$in':
            case '$nin': {
                const IN_OP = {
                    $in: 'in',
                    $nin: 'not in',
                };
                if (value instanceof Array) {
                    const values = value.map(
                        (v: PrimitiveValue) => {
                            if (['varchar', 'char', 'text', 'nvarchar'].includes(type as string)) {
                                return `'${v}'`;
                            }
                            else {
                                return `${v}`;
                            }
                        }
                    );
                    return ` ${IN_OP[attr]}(${values.join(',')})`;
                }
                else {
                    // sub query
                    return ` ${IN_OP[attr]}(${this.translateSelect(value)})`;
                }
            }
            case '$between': {
                const values = value.map(
                    (v: PrimitiveValue) => {
                        if (['varchar', 'char', 'text', 'nvarchar'].includes(type as string)) {
                            return `'${v}'`;
                        }
                        else {
                            return `${v}`;
                        }
                    }
                );
                return ` between ${values[0]} and ${values[1]}`;
            }
            default: {
                assert(false);
                return '';
            }
        }
    }

    /**
     * check the attribute in sort exists in projection
     * @param entity 
     * @param projection 
     * @param sort 
     */
    private checkSortWithProjection(entity: string, projection: Projection, sort: Sort) {
        const merged = {};
        sort.forEach(
            ({ $attr }) => merge(merged, $attr)            
        );
        const { schema } = this;

        const checkInProjection = (sortNode: SortAttr, projectionNode: Projection, entity: string, path: string) => {
            const { attributes } = schema[entity];
            const attrs = Object.keys(sortNode);
            attrs.forEach(
                (attr) => {
                    if (attr.toLocaleLowerCase().startsWith('$fncall')) {
                        return;
                    }
                    if (attributes.hasOwnProperty(attr)) {
                        /* if (!projectionNode.hasOwnProperty(attr)) {
                            throw ErrorCode.createError(ErrorCode.sortAttrUnexisted, `sort attribute ${path}/${attr} unexisted in projection`, {
                                path,
                                attr,
                            });
                        } */
                        if (attributes[attr].type === 'ref') {
                            checkInProjection(sortNode[attr] as SortAttr, projectionNode[attr] as Projection, attributes[attr].ref as string, `${path}${attr}/`);
                        }                        
                    }
                    else {
                        // there must exist one homonymous 'as' in function call.
                        const fnCalls = Object.keys(projectionNode).filter(
                            (pAttr) => pAttr.toLowerCase().startsWith('$fncall')
                        );

                        const asS = fnCalls.map(
                            (fnCall) => (projectionNode[fnCall] as FnCall).$as
                        );
                        const asS2 = asS.concat((Object.keys(projectionNode).filter(
                            k => typeof projectionNode[k] === 'string'
                        )).map(
                            k => projectionNode[k as string]
                        ) as string[]);

                        if (!asS2.includes(attr)) {
                            throw ErrorCode.createError(ErrorCode.sortAttrUnexisted, `sort attribute ${path}${attr} unexisted in projection`, {
                                path,
                                attr,
                            });
                        }
                    }
                }
            );
        };

        checkInProjection(merged, projection, entity, './');
    }

    translateProjection(entity: string, projection: Projection, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;
        const translateInner = (entity2: string, projection2: Projection, path: string): string => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let projText = '';

            let prefix = path.slice(2).replace(/\//g, '.');
            Object.keys(projection2).forEach(
                (attr, idx) => {
                    if (attr.toLowerCase().startsWith('$fncall')) {
                        // functionCall
                        projText += this.translateFnCall(projection2[attr] as FnCall, alias, prefix);
                    }
                    else {
                        const { type, ref } = attributes[attr];
                        if (type === 'ref') {
                            projText += translateInner(ref as string, projection2[attr] as Projection, `${path}${attr}/`);
                        }
                        else if (projection2[attr] === 1){
                            projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${prefix}${attr}\``;
                        }
                        else {
                            assert(typeof projection2[attr] === 'string');
                            if ((projection2[attr] as string).startsWith('$$')) {
                                projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${(projection2[attr] as string).slice(2)}\``;
                            }
                            else {
                                projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${prefix}${projection2[attr]}\``;
                            }
                        }
                    }
                    if (idx < Object.keys(projection2).length - 1) {
                        projText += ',';
                    }
                }
            );

            return projText;
        };

        return translateInner(entity, projection, './');
    }

    translateGroupBy(entity: string, groupBy: GroupBy, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;
        
        const translateInner = (entity2: string, groupBy2: GroupBy, path: string): string => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let groupByText = '';

            Object.keys(groupBy2).forEach(
                (attr, idx) => {
                    const { type, ref } = attributes[attr];
                        if (type === 'ref') {
                            groupByText += translateInner(ref as string, groupBy2[attr] as GroupBy, `${path}${attr}/`);
                        }
                        else {
                            assert (groupBy2[attr] === 1);
                            groupByText += ` \`${alias}\`.\`${attr}\``;
                        }
                    if (idx < Object.keys(groupBy2).length - 1) {
                        groupByText += ',';
                    }
                }
            );

            return groupByText;
        };

        return translateInner(entity, groupBy, './');
    }

    translateWhere(entity: string, query: Query, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;

        const translateInner = (entity2: string, query2: Query, path: string, type?: DataType): string => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let whereText = '';
            Object.keys(query2).forEach(
                (attr, idx) => {
                    if (LogicOperators.includes(attr)) {
                        let result = '';
                        switch(attr as LogicOperator) {
                            case '$and':
                            case '$or':
                            case '$xor': {
                                const logicQueries = query2[attr] as LogicQuery[] | PlainQuery[];
                                logicQueries.forEach(
                                    (lg: LogicQuery | PlainQuery, index: number) => {
                                        whereText += ` (${translateInner(entity2, lg, path)})`;
                                        if (index < logicQueries.length - 1) {
                                            whereText += ` ${attr.slice(1)}`;
                                        }
                                    }
                                );
                                break;
                            }
                            case '$not': {
                                const logicQuery = query2[attr] as LogicQuery | PlainQuery;
                                whereText += ` not (${translateInner(entity2, logicQuery, path)})`;
                                break;
                            }
                            default: {
                                assert(false);
                                return '';
                            }
                        }                        
                    }
                    else if (attr.toLowerCase().startsWith('$fncall')) {
                        // functionCall
                        whereText += ` (${this.translateFnCall(query2[attr] as FnCall, alias)})`;
                    }
                    else if (ComparisonOperators.includes(attr)) {
                        whereText += this.translateComparison(attr as ComparisonOperator, query2[attr] as PrimitiveValue, type as DataType);
                    }
                    else if (ElementOperators.includes(attr)) {
                        whereText += this.translateElement(attr as ElementOperator, query2[attr] as boolean);
                    }
                    else if (EvaluationOperators.includes(attr)) {
                        whereText += this.translateEvaluation(attr as EvaluationOperator, query2[attr], entity2, alias, type as DataType);
                    }
                    else if (SpatialOperators.includes(attr)) {
                        throw new Error('暂不支持的算子');
                    }
                    else {
                        assert (attributes.hasOwnProperty(attr));
                        const { type: type2, ref } = attributes[attr];
                        if (type2 === 'ref') {
                            whereText += ` ${translateInner(ref as string, query2[attr] as Query, `${path}${ref}/`)}`;
                        }
                        else if (typeof query2[attr] === 'object' && Object.keys(query2[attr])[0] && Object.keys(query2[attr])[0].startsWith('$')){
                            whereText += ` \`${alias}\`.\`${attr}\` ${translateInner(entity2, query2[attr] as PlainQuery, path, type2)}`
                        }
                        else {
                            whereText += ` \`${alias}\`.\`${attr}\` = ${this.translateAttrValue(type2, query2[attr])}`;
                        }
                    }

                    if (idx < Object.keys(query2).length - 1) {
                        whereText +=' and'
                    }
                }
            );

            return whereText;
        };

        return translateInner(entity, query, './');
    }

    translateSort(entity: string, sort: Sort, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;
        const translateInner = (entity2: string, sortAttr: SortAttr, path: string): string => {
            const attr = Object.keys(sortAttr)[0];
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let prefix = path.slice(2).replace(/\//g, '.');

            if (attr.toLocaleLowerCase().startsWith('$fncall')) {
                return this.translateFnCall(sortAttr[attr] as FnCall, alias, prefix);
            }
            else if (sortAttr[attr] === 1) {
                return ` \`${alias}\`.\`${attr}\``;
            }
            else {
                const { ref, type } = attributes[attr];
                assert(type === 'ref');
                return translateInner(ref as string, sortAttr[attr] as SortAttr, `${path}${attr}/`);
            }
        };

        let sortText = '';
        sort.forEach(
            (sortNode, index) => {
                const { $attr, $direction } = sortNode;
                sortText += translateInner(entity, $attr, './');
                if ($direction) {
                    sortText += ` ${$direction}`;
                }

                if (index < sort.length - 1) {
                    sortText += ',';
                }
            }
        );

        return sortText;
    }

    translateSelect({ entity, projection, query, indexFrom, count, sort, forUpdate, groupBy }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        indexFrom?: number | undefined;
        count?: number | undefined;
        forUpdate?: boolean | undefined;
        sort?: Sort;
        groupBy?: GroupBy;
    }): TranslateResult {
        const projection2 = this.formalizeProjection(entity, projection);
        if (sort){
            this.checkSortWithProjection(entity, projection2, sort);
        }

        const { from: fromText, aliasDict } = this.analyzeJoin({
            entity,
            projection: projection2,
            query,
            sort,
        });

        const projText = this.translateProjection(entity, projection2, aliasDict);

        let sql = `select ${projText} from ${fromText}`;
        
        if (query) {
            sql += ` where ${this.translateWhere(entity, query, aliasDict)}`;
        }
        
        if (sort) {
            const sortText = this.translateSort(entity, sort, aliasDict);
            if (sortText) {
                sql += ` order by ${sortText}`;
            }
        }

        if (typeof indexFrom === 'number') {
            assert(count);
            sql += this.translateIndexFromCount(indexFrom, count as number);
        }

        if (forUpdate) {
            sql += this.translateForUpdate();
        }

        if (groupBy) {
            assert(!indexFrom && !count && !forUpdate);
            sql += ` group by ${this.translateGroupBy(entity, groupBy, aliasDict)}`;
        }

        return sql;
    }

    /**
     * update table t1 set t1.a1 = v1 where (id = 1)/(t1.a2 = v2);
     * @param param0 
     */
    translateUpdate({ entity, data, id, query }: {
        entity: string;
        data: Data;
        id?: string | number;
        query?: Query;
    }): string {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];

        let sql = `update ${storageName} ${entity} set`;
        const attrs = Object.keys(data);

        attrs.forEach(
            (attr, attrIdx) => {
                const attrDef = attributes[attr];
                const { type: dataType } = attrDef;
                const value = this.translateAttrValue(dataType as DataType, data[attr] as Value);
                sql += ` \`${attr}\` = ${value}`;
                if (attrIdx < attrs.length - 1) {
                    sql += ',';
                }
            }
        );

        if (id) {
            sql += ` where id = ${id}`;
        }
        else if (query){
            const whereText = this.translateWhere(entity, query, {
                './': entity,
            });
            sql += ` where ${whereText}`;
        }

        return sql;
    }

    translateRemove({ entity, id, query }: {
        entity: string;
        id?: string | number;
        query?: Query;
    }) : TranslateResult {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];

        let sql = `delete from ${storageName} ${entity}`;

        if (id) {
            sql += ` where id = ${id}`;
        }
        else if (query) {
            const whereText = this.translateWhere(entity, query, {
                './': entity,
            });
            sql += whereText;
        }

        return sql;
    }
}