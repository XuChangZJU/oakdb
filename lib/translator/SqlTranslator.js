"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlTranslator = void 0;
const util_1 = __importDefault(require("util"));
const Translator_1 = require("./Translator");
const Operator_1 = require("../types/Operator");
const lodash_1 = require("lodash");
const console_1 = require("console");
const errorCode_1 = require("../errorCode");
class SqlTranslator extends Translator_1.Translator {
    translateDestroyEntity(entity, truncate) {
        const { schema } = this;
        const { storageName = entity, view } = schema[entity];
        let sql;
        if (view) {
            sql = `drop view \`${storageName}\``;
        }
        else {
            sql = truncate ? `truncate table \`${storageName}\`` : `drop table if exists \`${storageName}\``;
        }
        return sql;
    }
    translateInsertRow(entity, data) {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];
        let sql = `insert into \`${storageName}\`(`;
        const attrs = Object.keys(data[0]);
        attrs.forEach((attr, idx) => {
            sql += ` \`${attr}\``;
            if (idx < Object.keys(data[0]).length - 1) {
                sql += ',';
            }
        });
        sql += ') values ';
        data.forEach((d, dataIndex) => {
            sql += '(';
            attrs.forEach((attr, attrIdx) => {
                const attrDef = attributes[attr];
                const { type: dataType } = attrDef;
                const value = this.translateAttrValue(dataType, d[attr]);
                sql += value;
                if (attrIdx < attrs.length - 1) {
                    sql += ',';
                }
            });
            sql += ')';
            if (dataIndex < data.length - 1) {
                sql += ',';
            }
        });
        return sql;
    }
    formalizeProjection(entity, projection, noExpand) {
        const projection2 = projection || {};
        const { schema } = this;
        const { attributes } = schema[entity];
        Object.keys(attributes).forEach((attr) => {
            if (!attr.match(/\$\$[\d|\D]+\$\$$/)) { // omit metadata by default
                const { type } = attributes[attr];
                if (type === 'ref') {
                    if (!noExpand && (!projection || projection[attr] || projection.hasOwnProperty('$all'))) {
                        const { ref } = attributes[attr];
                        const projection3 = this.formalizeProjection(ref, projection && projection[attr], true);
                        lodash_1.assign(projection2, {
                            [attr]: projection3,
                        });
                    }
                }
                else if (!projection || projection.hasOwnProperty('$all')) {
                    lodash_1.assign(projection2, {
                        [attr]: 1,
                    });
                }
            }
        });
        lodash_1.unset(projection2, '$all');
        return projection2;
    }
    /**
     * analyze the join relations in projection/query/sort
     * @param param0
     */
    analyzeJoin({ entity, projection, query, sort }) {
        const { schema } = this;
        let count = 1;
        const getStorageName = (entity) => {
            const { storageName } = schema[entity];
            return storageName || entity;
        };
        const alias = `${entity}_${count++}`;
        let from = ` \`${getStorageName(entity)}\` \`${alias}\` `;
        const aliasDict = {
            './': alias,
        };
        const analyzeQueryNode = ({ node, path, entityName, alias }) => {
            const { attributes } = schema[entityName];
            Object.keys(node).forEach((op) => {
                if (Operator_1.LogicOperators.includes(op)) {
                    node[op].forEach((subNode) => analyzeQueryNode({
                        node: subNode,
                        path,
                        entityName,
                        alias,
                    }));
                }
                else if (attributes[op] && attributes[op].type === 'ref') {
                    const { ref } = attributes[op];
                    const pathAttr = `${path}${op}/`;
                    let alias2;
                    if (!aliasDict.hasOwnProperty(pathAttr)) {
                        alias2 = `${ref}_${count++}`;
                        lodash_1.assign(aliasDict, {
                            [pathAttr]: alias2,
                        });
                        from += ` inner join \`${getStorageName(ref)}\` \`${alias2}\` on \`${alias}\`.\`${op}Id\` = \`${alias2}\`.\`id\``;
                    }
                    else {
                        alias2 = aliasDict[pathAttr];
                    }
                    analyzeQueryNode({
                        node: node[op],
                        path: pathAttr,
                        entityName: ref,
                        alias: alias2,
                    });
                }
            });
        };
        if (query) {
            analyzeQueryNode({
                node: query,
                path: './',
                entityName: entity,
                alias,
            });
        }
        const analyzeSortNode = ({ attr, node, path, entityName, alias }) => {
            const { attributes } = schema[entityName];
            if (typeof node === 'object' && attributes[attr] && (attributes[attr].type === 'ref')) {
                const { ref } = attributes[attr];
                const pathAttr = `${path}${attr}/`;
                let alias2;
                if (!aliasDict.hasOwnProperty(pathAttr)) {
                    alias2 = `${ref}_${count++}`;
                    lodash_1.assign(aliasDict, {
                        [pathAttr]: alias2,
                    });
                    from += ` inner join \`${getStorageName(ref)}\` \`${alias2}\` on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
                }
                else {
                    alias2 = aliasDict[pathAttr];
                }
                const nodeAttr = Object.keys(node)[0];
                analyzeSortNode({
                    attr: nodeAttr,
                    node: node[nodeAttr],
                    path: pathAttr,
                    entityName: ref,
                    alias: alias2,
                });
            }
        };
        if (sort) {
            sort.forEach((sortNode) => {
                const { $attr } = sortNode;
                if (typeof $attr !== 'string') {
                    const attr = Object.keys($attr)[0];
                    analyzeSortNode({ attr, node: $attr[attr], path: './', entityName: entity, alias });
                }
            });
        }
        const analyzeProjectionNode = ({ node, path, entityName, alias }) => {
            const { attributes } = schema[entityName];
            Object.keys(node).forEach((attr) => {
                if (attributes[attr] && attributes[attr].type === 'ref') {
                    const { ref } = attributes[attr];
                    const pathAttr = `${path}${attr}/`;
                    let alias2;
                    if (!aliasDict.hasOwnProperty(pathAttr)) {
                        alias2 = `${ref}_${count++}`;
                        lodash_1.assign(aliasDict, {
                            [pathAttr]: alias2,
                        });
                        from += ` left join \`${getStorageName(ref)}\` \`${alias2}\` on \`${alias}\`.\`${attr}Id\` = \`${alias2}\`.\`id\``;
                    }
                    else {
                        alias2 = aliasDict[pathAttr];
                    }
                    analyzeProjectionNode({
                        node: node[attr],
                        path: pathAttr,
                        entityName: ref,
                        alias: alias2,
                    });
                }
            });
        };
        analyzeProjectionNode({ node: projection, path: './', entityName: entity, alias });
        return {
            aliasDict,
            from,
        };
    }
    translateFnCall(fnCall, alias, prefix) {
        const { $format, $attrs, $as, $omitPrefix } = fnCall;
        let result = '';
        const attrs = $attrs ? $attrs.map((ele) => {
            return ` \`${alias}\`.\`${ele}\``;
        }) : [];
        const args = [$format].concat(attrs);
        result += ` ${util_1.default.format.apply(null, args)}`;
        if ($as) {
            console_1.assert($as.startsWith('$')); // use particular namespace;
            if ($omitPrefix) {
                result += ` as ${$as}`;
            }
            else {
                result += ` as \`${prefix}${$as}\``;
            }
        }
        return result;
    }
    translateComparison(attr, value, type) {
        const SQL_OP = {
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
    translateElement(attr, value) {
        console_1.assert(attr === '$exists'); // only support one operator now
        if (value) {
            return ' is not null';
        }
        return ' is null';
    }
    translateEvaluation(attr, value, entity, alias, type) {
        switch (attr) {
            case '$text': {
                // fulltext search
                return this.translateFullTextSearch(value, entity, alias);
            }
            case '$in':
            case '$nin': {
                const IN_OP = {
                    $in: 'in',
                    $nin: 'not in',
                };
                if (value instanceof Array) {
                    const values = value.map((v) => {
                        if (['varchar', 'char', 'text', 'nvarchar'].includes(type)) {
                            return `'${v}'`;
                        }
                        else {
                            return `${v}`;
                        }
                    });
                    return ` ${IN_OP[attr]}(${values.join(',')})`;
                }
                else {
                    // sub query
                    return ` ${IN_OP[attr]}(${this.translateSelect(value)})`;
                }
            }
            case '$between': {
                const values = value.map((v) => {
                    if (['varchar', 'char', 'text', 'nvarchar'].includes(type)) {
                        return `'${v}'`;
                    }
                    else {
                        return `${v}`;
                    }
                });
                return ` between ${values[0]} and ${values[1]}`;
            }
            default: {
                console_1.assert(false);
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
    checkSortWithProjection(entity, projection, sort) {
        const merged = {};
        sort.forEach(({ $attr }) => lodash_1.merge(merged, $attr));
        const { schema } = this;
        const checkInProjection = (sortNode, projectionNode, entity, path) => {
            const { attributes } = schema[entity];
            const attrs = Object.keys(sortNode);
            attrs.forEach((attr) => {
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
                        checkInProjection(sortNode[attr], projectionNode[attr], attributes[attr].ref, `${path}${attr}/`);
                    }
                }
                else {
                    // there must exist one homonymous 'as' in function call.
                    const fnCalls = Object.keys(projectionNode).filter((pAttr) => pAttr.toLowerCase().startsWith('$fncall'));
                    const asS = fnCalls.map((fnCall) => projectionNode[fnCall].$as);
                    const asS2 = asS.concat((Object.keys(projectionNode).filter(k => typeof projectionNode[k] === 'string')).map(k => projectionNode[k]));
                    if (!asS2.includes(attr)) {
                        throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.sortAttrUnexisted, `sort attribute ${path}${attr} unexisted in projection`, {
                            path,
                            attr,
                        });
                    }
                }
            });
        };
        checkInProjection(merged, projection, entity, './');
    }
    translateProjection(entity, projection, aliasDict) {
        const { schema } = this;
        const translateInner = (entity2, projection2, path) => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let projText = '';
            let prefix = path.slice(2).replace(/\//g, '.');
            Object.keys(projection2).forEach((attr, idx) => {
                if (attr.toLowerCase().startsWith('$fncall')) {
                    // functionCall
                    projText += this.translateFnCall(projection2[attr], alias, prefix);
                }
                else {
                    const { type, ref } = attributes[attr];
                    if (type === 'ref') {
                        projText += translateInner(ref, projection2[attr], `${path}${attr}/`);
                    }
                    else if (projection2[attr] === 1) {
                        projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${prefix}${attr}\``;
                    }
                    else {
                        console_1.assert(typeof projection2[attr] === 'string');
                        if (projection2[attr].startsWith('$$')) {
                            projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${projection2[attr].slice(2)}\``;
                        }
                        else {
                            projText += ` ${this.translateAttrProjection(type, alias, attr)} as \`${prefix}${projection2[attr]}\``;
                        }
                    }
                }
                if (idx < Object.keys(projection2).length - 1) {
                    projText += ',';
                }
            });
            return projText;
        };
        return translateInner(entity, projection, './');
    }
    translateGroupBy(entity, groupBy, aliasDict) {
        const { schema } = this;
        const translateInner = (entity2, groupBy2, path) => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let groupByText = '';
            Object.keys(groupBy2).forEach((attr, idx) => {
                const { type, ref } = attributes[attr];
                if (type === 'ref') {
                    groupByText += translateInner(ref, groupBy2[attr], `${path}${attr}/`);
                }
                else {
                    console_1.assert(groupBy2[attr] === 1);
                    groupByText += ` \`${alias}\`.\`${attr}\``;
                }
                if (idx < Object.keys(groupBy2).length - 1) {
                    groupByText += ',';
                }
            });
            return groupByText;
        };
        return translateInner(entity, groupBy, './');
    }
    translateWhere(entity, query, aliasDict) {
        const { schema } = this;
        const translateInner = (entity2, query2, path, type) => {
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let whereText = '';
            Object.keys(query2).forEach((attr, idx) => {
                if (Operator_1.LogicOperators.includes(attr)) {
                    let result = '';
                    switch (attr) {
                        case '$and':
                        case '$or':
                        case '$xor': {
                            const logicQueries = query2[attr];
                            logicQueries.forEach((lg, index) => {
                                whereText += ` (${translateInner(entity2, lg, path)})`;
                                if (index < logicQueries.length - 1) {
                                    whereText += ` ${attr.slice(1)}`;
                                }
                            });
                            break;
                        }
                        case '$not': {
                            const logicQuery = query2[attr];
                            whereText += ` not (${translateInner(entity2, logicQuery, path)})`;
                            break;
                        }
                        default: {
                            console_1.assert(false);
                            return '';
                        }
                    }
                }
                else if (attr.toLowerCase().startsWith('$fncall')) {
                    // functionCall
                    whereText += ` (${this.translateFnCall(query2[attr], alias)})`;
                }
                else if (Operator_1.ComparisonOperators.includes(attr)) {
                    whereText += this.translateComparison(attr, query2[attr], type);
                }
                else if (Operator_1.ElementOperators.includes(attr)) {
                    whereText += this.translateElement(attr, query2[attr]);
                }
                else if (Operator_1.EvaluationOperators.includes(attr)) {
                    whereText += this.translateEvaluation(attr, query2[attr], entity2, alias, type);
                }
                else if (Operator_1.SpatialOperators.includes(attr)) {
                    throw new Error('暂不支持的算子');
                }
                else {
                    console_1.assert(attributes.hasOwnProperty(attr));
                    const { type: type2, ref } = attributes[attr];
                    if (type2 === 'ref') {
                        whereText += ` ${translateInner(ref, query2[attr], `${path}${ref}/`)}`;
                    }
                    else if (typeof query2[attr] === 'object' && Object.keys(query2[attr])[0] && Object.keys(query2[attr])[0].startsWith('$')) {
                        whereText += ` \`${alias}\`.\`${attr}\` ${translateInner(entity2, query2[attr], path, type2)}`;
                    }
                    else {
                        whereText += ` \`${alias}\`.\`${attr}\` = ${this.translateAttrValue(type2, query2[attr])}`;
                    }
                }
                if (idx < Object.keys(query2).length - 1) {
                    whereText += ' and';
                }
            });
            return whereText;
        };
        return translateInner(entity, query, './');
    }
    translateSort(entity, sort, aliasDict) {
        const { schema } = this;
        const translateInner = (entity2, sortAttr, path) => {
            const attr = Object.keys(sortAttr)[0];
            const alias = aliasDict[path];
            const { attributes } = schema[entity2];
            let prefix = path.slice(2).replace(/\//g, '.');
            if (attr.toLocaleLowerCase().startsWith('$fncall')) {
                return this.translateFnCall(sortAttr[attr], alias, prefix);
            }
            else if (sortAttr[attr] === 1) {
                return ` \`${alias}\`.\`${attr}\``;
            }
            else {
                const { ref, type } = attributes[attr];
                console_1.assert(type === 'ref');
                return translateInner(ref, sortAttr[attr], `${path}${attr}/`);
            }
        };
        let sortText = '';
        sort.forEach((sortNode, index) => {
            const { $attr, $direction } = sortNode;
            sortText += translateInner(entity, $attr, './');
            if ($direction) {
                sortText += ` ${$direction}`;
            }
            if (index < sort.length - 1) {
                sortText += ',';
            }
        });
        return sortText;
    }
    translateSelect({ entity, projection, query, indexFrom, count, sort, forUpdate, groupBy }) {
        const projection2 = this.formalizeProjection(entity, projection);
        if (sort) {
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
            console_1.assert(count);
            sql += this.translateIndexFromCount(indexFrom, count);
        }
        if (forUpdate) {
            sql += this.translateForUpdate();
        }
        if (groupBy) {
            console_1.assert(!indexFrom && !count && !forUpdate);
            sql += ` group by ${this.translateGroupBy(entity, groupBy, aliasDict)}`;
        }
        return sql;
    }
    /**
     * update table t1 set t1.a1 = v1 where (id = 1)/(t1.a2 = v2);
     * @param param0
     */
    translateUpdate({ entity, data, id, query }) {
        const { schema } = this;
        const { attributes, storageName = entity } = schema[entity];
        let sql = `update \`${storageName}\` \`${entity}\` set`;
        const attrs = Object.keys(data);
        attrs.forEach((attr, attrIdx) => {
            const attrDef = attributes[attr];
            const { type: dataType } = attrDef;
            const value = this.translateAttrValue(dataType, data[attr]);
            sql += ` \`${attr}\` = ${value}`;
            if (attrIdx < attrs.length - 1) {
                sql += ',';
            }
        });
        if (id) {
            sql += ` where id = ${id}`;
        }
        else if (query) {
            const whereText = this.translateWhere(entity, query, {
                './': entity,
            });
            sql += ` where ${whereText}`;
        }
        return sql;
    }
    translateRemove({ entity, id, query }) {
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
exports.SqlTranslator = SqlTranslator;
