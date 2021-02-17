import util, { log } from 'util';
import { Translator } from './Translator';
import { Data, Value } from '../types/Result';
import { DataType } from '../DataType';
import { Projection } from '../types/Projection';
import { FnCall, LogicQuery, PlainQuery, Query } from '../types/Query';
import { LogicOperator, LogicOperators } from '../types/Operator';
import { TranslateResult } from './translate-result/TranslateResult';
import { assign } from 'lodash';
import { stringify } from 'uuid';
import { Sort, SortAttr } from '../types/Sort';
import { assert } from 'console';
import { Alias } from 'typeorm/query-builder/Alias';

export abstract class SqlTranslator extends Translator {
    translateDestroyEntity(entity: string, truncate?: boolean):string {
        const { schema } = this;
        const { storageName = entity } = schema[entity];
        
        const sql = truncate ? `truncate table ${storageName}`: `drop table if exists ${storageName}`;

        return sql;
    }

    abstract translateAttrValue(attr: string, dataType: DataType, value: Value | Data ): string;

    translateInsertRow(entity: string, data: Data): string {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];
        
        let sql = `insert into ${storageName}(`;

        const attrs = Object.keys(data);
        attrs.forEach(
            (attr, idx) => {
                sql += ` ${attr}`;
                if (idx < Object.keys(data).length - 1) {
                    sql += ',';
                }
            }
        );

        sql += ') values (';

        attrs.forEach(
            (attr, idx) => {
                const attrDef = attributes[attr];
                const { type: dataType } = attrDef;
                const value = this.translateAttrValue(attr, dataType as DataType, data[attr] as Value);
                sql += value;
                if (idx < attrs.length - 1) {
                    sql += ',';
                }
            }
        );
        sql += ');';

        return sql;
    }

    private getDefaultProjection(entity: string, noExpand?:boolean): Projection {
        const projection: Projection = {};
        const { schema } = this;

        const { attributes } = schema[entity];

        Object.keys(attributes).forEach(
            (attr) => {
                if (!attr.match(/\$\$[\d|\D]+\$\$$/)) {     // omit metadata by default
                    const { type } = attributes[attr];
                    if (type === 'ref') {
                        if (!noExpand) {
                            const { ref } = attributes[attr];
                            const projection2 = this.getDefaultProjection(ref as string, true);
                            assign(projection, {
                                [attr]: projection2,
                            });
                        }
                    }
                    else {
                        assign(projection, {
                            [attr]: 1,
                        });
                    }
                }
            }
        );

        return projection;
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
                            from += ` left join \`${getStorageName(ref as string)}\` \`${alias2}\`
                                 on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
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
                    else if (!attributes.hasOwnProperty(op) && !op.startsWith('$')) {
                        // in/exists算子， todo
                    }
                    else if (attributes[op].type === 'ref') {
                        const { ref } = attributes[op];
                        const pathAttr = `${path}${op}/`;
                        let alias2;
                        if (!aliasDict.hasOwnProperty(pathAttr)) {
                            alias2 = `${ref}_${count++}`;
                            assign(aliasDict, {
                                [pathAttr]: alias2,
                            });
                            from += ` left join \`${getStorageName(ref as string)}\` \`${alias2}\`
                                 on \`${alias}\`.\`${op}Id\` = \`${alias2}\`.\`id\``;
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
            node: 1 | string | SortAttr;
            path: string;
            entityName: string;
            alias: string;
        }): void => {
            const { attributes } = schema[entityName];
            if (typeof node === 'object' && (attributes[attr].type === 'ref')) {
                const { ref } = attributes[attr];
                const pathAttr = `${path}${attr}/`;
                let alias2;
                if (!aliasDict.hasOwnProperty(pathAttr)) {
                    alias2 = `${ref}_${count++}`;
                    assign(aliasDict, {
                        [pathAttr]: alias2,
                    });
                    from += ` left join \`${getStorageName(ref as string)}\` \`${alias2}\`
                         on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
                }
                else {
                    alias2 = aliasDict[pathAttr];
                }
                const nodeAttr = Object.keys(node)[0];
                analyzeSortNode({
                    attr: nodeAttr,
                    node: node[nodeAttr],
                    path: pathAttr,
                    entityName: ref as string,
                    alias: alias2,
                });
            }
        }
        if (sort) {
            sort.forEach(
                (sortNode) => {
                    const sortAttr = sortNode.$attr;
                    const attr = Object.keys(sortAttr)[0];
                    analyzeSortNode({ attr, node: sortAttr[attr], path: './', entityName: entity, alias });
                }
            );
        }

        return {
            aliasDict,
            from,
        };
    }

    tranlateFnCall(fnCall: FnCall, alias: string, prefix?: string): string {
        const { $format, $attrs, $as }: {
            $format: string,
            $attrs?: string[],
            $as?: string,
        } = fnCall;

        let result = '';
        const attrs = $attrs ? $attrs.map(
            (ele) => {
                return ` \`${alias}\`.\`${ele}\``;
            }
        ): [];
        const args = [$format].concat(attrs);
        result += ` ${util.format.apply(null, args)}`;
        if ($as) {
            result += ` as ${prefix}${$as}`;
        }

        return result;
    }

    translateProjection(entity: string, projection: Projection, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;
        const translateInner = (entity2: string, projection2: Projection, path: string): string => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let projText = '';

            let prefix = path.slice(2).replace('/', '.');
            Object.keys(projection2).forEach(
                (attr, idx) => {
                    if (attr.toLowerCase().startsWith('$fncall')) {
                        // functionCall
                        projText += this.tranlateFnCall(projection2[attr] as FnCall, alias, prefix);
                    }
                    else {
                        const { type, ref } = attributes[attr];
                        if (type === 'ref') {
                            projText += translateInner(ref as string, projection2[attr] as Projection, `${path}${attr}/`);
                        }
                        else if (projection2[attr] === 1){
                            projText += ` \`${alias}\`.\`${attr}\` as ${prefix}${attr}`;
                        }
                        else {
                            assert(typeof projection2[attr] === 'string');
                            projText += ` \`${alias}\`.\`${attr}\` as ${prefix}${projection2[attr]}`;
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

    translateWhere(entity: string, query: Query, aliasDict: {
        [propName: string]: string;
    }): string {
        const { schema } = this;

        const translateInner = (entity2: string, query2: Query, path: string): string => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let whereText = 'where ';
            Object.keys(query).forEach(
                (attr) => {
                    if (LogicOperators.includes(attr)) {
                        const logicQueries = query[attr] as LogicQuery[] | PlainQuery[];
                        logicQueries.forEach(
                            (lg: LogicQuery | PlainQuery, index: number) => {
                                whereText += `${translateInner(entity2, lg, path)} `;
                                if (index < logicQueries.length - 1) {
                                    whereText += attr.slice(1);
                                }
                            }
                        );
                    }
                    else if ()
                }
            );

            return whereText;
        };

        return translateInner(entity, query, './');
    }

    translateSelect({ entity, projection, query, indexFrom, count, sort, forUpdate }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        indexFrom?: number | undefined;
        count?: number | undefined;
        forUpdate?: boolean | undefined;
        sort?: Sort;
    }): TranslateResult {
        const projection2 = projection || this.getDefaultProjection(entity);

        const { from: fromText, aliasDict } = this.analyzeJoin({
            entity,
            projection: projection2,
            query,
            sort,
        });

        const projText = this.translateProjection(entity, projection2, aliasDict);

        const sql = `select ${projText} from ${fromText}`;

        return sql;
    }
}