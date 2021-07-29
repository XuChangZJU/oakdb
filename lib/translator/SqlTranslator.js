"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlTranslator = void 0;
var util_1 = __importDefault(require("util"));
var Translator_1 = require("./Translator");
var Operator_1 = require("../types/Operator");
var lodash_1 = require("lodash");
var console_1 = require("console");
var errorCode_1 = require("../errorCode");
var SqlTranslator = /** @class */ (function (_super) {
    __extends(SqlTranslator, _super);
    function SqlTranslator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SqlTranslator.prototype.translateDestroyEntity = function (entity, truncate) {
        var schema = this.schema;
        var _a = schema[entity], _b = _a.storageName, storageName = _b === void 0 ? entity : _b, view = _a.view;
        var sql;
        if (view) {
            sql = "drop view `" + storageName + "`";
        }
        else {
            sql = truncate ? "truncate table `" + storageName + "`" : "drop table if exists `" + storageName + "`";
        }
        return sql;
    };
    SqlTranslator.prototype.translateInsertRow = function (entity, data) {
        var _this = this;
        var schema = this.schema;
        var _a = schema[entity], attributes = _a.attributes, _b = _a.storageName, storageName = _b === void 0 ? entity : _b;
        var sql = "insert into `" + storageName + "`(";
        var attrs = Object.keys(data[0]);
        attrs.forEach(function (attr, idx) {
            sql += " `" + attr + "`";
            if (idx < Object.keys(data[0]).length - 1) {
                sql += ',';
            }
        });
        sql += ') values ';
        data.forEach(function (d, dataIndex) {
            sql += '(';
            attrs.forEach(function (attr, attrIdx) {
                var attrDef = attributes[attr];
                var dataType = attrDef.type;
                var value = _this.translateAttrValue(dataType, d[attr]);
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
    };
    SqlTranslator.prototype.formalizeProjection = function (entity, projection, noExpand) {
        var _this = this;
        var projection2 = projection || {};
        var schema = this.schema;
        var attributes = schema[entity].attributes;
        Object.keys(attributes).forEach(function (attr) {
            var _a, _b;
            if (!attr.match(/\$\$[\d|\D]+\$\$$/)) { // omit metadata by default
                var type = attributes[attr].type;
                if (type === 'ref') {
                    if (!noExpand && (!projection || projection[attr] || projection.hasOwnProperty('$all'))) {
                        var ref = attributes[attr].ref;
                        var projection3 = _this.formalizeProjection(ref, projection && projection[attr], true);
                        lodash_1.assign(projection2, (_a = {},
                            _a[attr] = projection3,
                            _a));
                    }
                }
                else if (!projection || projection.hasOwnProperty('$all')) {
                    lodash_1.assign(projection2, (_b = {},
                        _b[attr] = 1,
                        _b));
                }
            }
        });
        lodash_1.unset(projection2, '$all');
        return projection2;
    };
    /**
     * analyze the join relations in projection/query/sort
     * @param param0
     */
    SqlTranslator.prototype.analyzeJoin = function (_a) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, sort = _a.sort;
        var schema = this.schema;
        var count = 1;
        var getStorageName = function (entity) {
            var storageName = schema[entity].storageName;
            return storageName || entity;
        };
        var alias = entity + "_" + count++;
        var from = " `" + getStorageName(entity) + "` `" + alias + "` ";
        var aliasDict = {
            './': alias,
        };
        var analyzeQueryNode = function (_a) {
            var node = _a.node, path = _a.path, entityName = _a.entityName, alias = _a.alias;
            var attributes = schema[entityName].attributes;
            Object.keys(node).forEach(function (op) {
                var _a;
                if (Operator_1.LogicOperators.includes(op)) {
                    node[op].forEach(function (subNode) { return analyzeQueryNode({
                        node: subNode,
                        path: path,
                        entityName: entityName,
                        alias: alias,
                    }); });
                }
                else if (attributes[op] && attributes[op].type === 'ref') {
                    var ref = attributes[op].ref;
                    var pathAttr = "" + path + op + "/";
                    var alias2 = void 0;
                    if (!aliasDict.hasOwnProperty(pathAttr)) {
                        alias2 = ref + "_" + count++;
                        lodash_1.assign(aliasDict, (_a = {},
                            _a[pathAttr] = alias2,
                            _a));
                        from += " inner join `" + getStorageName(ref) + "` `" + alias2 + "` on `" + alias + "`.`" + op + "Id` = `" + alias2 + "`.`id`";
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
                alias: alias,
            });
        }
        var analyzeSortNode = function (_a) {
            var _b;
            var attr = _a.attr, node = _a.node, path = _a.path, entityName = _a.entityName, alias = _a.alias;
            var attributes = schema[entityName].attributes;
            if (typeof node === 'object' && attributes[attr] && (attributes[attr].type === 'ref')) {
                var ref = attributes[attr].ref;
                var pathAttr = "" + path + attr + "/";
                var alias2 = void 0;
                if (!aliasDict.hasOwnProperty(pathAttr)) {
                    alias2 = ref + "_" + count++;
                    lodash_1.assign(aliasDict, (_b = {},
                        _b[pathAttr] = alias2,
                        _b));
                    from += " inner join `" + getStorageName(ref) + "` `" + alias2 + "` on `" + alias + "`.`" + attr + "Id` = `" + alias2 + "`.`id`";
                }
                else {
                    alias2 = aliasDict[pathAttr];
                }
                var nodeAttr = Object.keys(node)[0];
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
            sort.forEach(function (sortNode) {
                var $attr = sortNode.$attr;
                if (typeof $attr !== 'string') {
                    var attr = Object.keys($attr)[0];
                    analyzeSortNode({ attr: attr, node: $attr[attr], path: './', entityName: entity, alias: alias });
                }
            });
        }
        var analyzeProjectionNode = function (_a) {
            var node = _a.node, path = _a.path, entityName = _a.entityName, alias = _a.alias;
            var attributes = schema[entityName].attributes;
            Object.keys(node).forEach(function (attr) {
                var _a;
                if (attributes[attr] && attributes[attr].type === 'ref') {
                    var ref = attributes[attr].ref;
                    var pathAttr = "" + path + attr + "/";
                    var alias2 = void 0;
                    if (!aliasDict.hasOwnProperty(pathAttr)) {
                        alias2 = ref + "_" + count++;
                        lodash_1.assign(aliasDict, (_a = {},
                            _a[pathAttr] = alias2,
                            _a));
                        from += " left join `" + getStorageName(ref) + "` `" + alias2 + "` on `" + alias + "`.`" + attr + "Id` = `" + alias2 + "`.`id`";
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
        analyzeProjectionNode({ node: projection, path: './', entityName: entity, alias: alias });
        return {
            aliasDict: aliasDict,
            from: from,
        };
    };
    SqlTranslator.prototype.translateFnCall = function (fnCall, alias, prefix) {
        var $format = fnCall.$format, $attrs = fnCall.$attrs, $as = fnCall.$as, $omitPrefix = fnCall.$omitPrefix;
        var result = '';
        var attrs = $attrs ? $attrs.map(function (ele) {
            return " `" + alias + "`.`" + ele + "`";
        }) : [];
        var args = [$format].concat(attrs);
        result += " " + util_1.default.format.apply(null, args);
        if ($as) {
            console_1.assert($as.startsWith('$')); // use particular namespace;
            if ($omitPrefix) {
                result += " as " + $as;
            }
            else {
                result += " as `" + prefix + $as + "`";
            }
        }
        return result;
    };
    SqlTranslator.prototype.translateComparison = function (attr, value, type) {
        var SQL_OP = {
            $gt: '>',
            $lt: '<',
            $gte: '>=',
            $lte: '<=',
            $eq: '=',
            $ne: '<>',
        };
        if (Object.keys(SQL_OP).includes(attr)) {
            return " " + SQL_OP[attr] + " " + this.translateAttrValue(type, value);
        }
        switch (attr) {
            case '$startsWith': {
                return " like '" + value + "%'";
            }
            case '$endsWith': {
                return " like '%" + value + "'";
            }
            case '$includes': {
                return " like '%" + value + "%'";
            }
            default: {
                throw new Error("unrecoganized comparison operator " + attr);
            }
        }
    };
    SqlTranslator.prototype.translateElement = function (attr, value) {
        console_1.assert(attr === '$exists'); // only support one operator now
        if (value) {
            return ' is not null';
        }
        return ' is null';
    };
    SqlTranslator.prototype.translateEvaluation = function (attr, value, entity, alias, type) {
        switch (attr) {
            case '$text': {
                // fulltext search
                return this.translateFullTextSearch(value, entity, alias);
            }
            case '$in':
            case '$nin': {
                var IN_OP = {
                    $in: 'in',
                    $nin: 'not in',
                };
                if (value instanceof Array) {
                    var values = value.map(function (v) {
                        if (['varchar', 'char', 'text', 'nvarchar'].includes(type)) {
                            return "'" + v + "'";
                        }
                        else {
                            return "" + v;
                        }
                    });
                    return " " + IN_OP[attr] + "(" + values.join(',') + ")";
                }
                else {
                    // sub query
                    return " " + IN_OP[attr] + "(" + this.translateSelect(value) + ")";
                }
            }
            case '$between': {
                var values = value.map(function (v) {
                    if (['varchar', 'char', 'text', 'nvarchar'].includes(type)) {
                        return "'" + v + "'";
                    }
                    else {
                        return "" + v;
                    }
                });
                return " between " + values[0] + " and " + values[1];
            }
            default: {
                console_1.assert(false);
                return '';
            }
        }
    };
    /**
     * check the attribute in sort exists in projection
     * @param entity
     * @param projection
     * @param sort
     */
    SqlTranslator.prototype.checkSortWithProjection = function (entity, projection, sort) {
        var merged = {};
        sort.forEach(function (_a) {
            var $attr = _a.$attr;
            return lodash_1.merge(merged, $attr);
        });
        var schema = this.schema;
        var checkInProjection = function (sortNode, projectionNode, entity, path) {
            var attributes = schema[entity].attributes;
            var attrs = Object.keys(sortNode);
            attrs.forEach(function (attr) {
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
                        checkInProjection(sortNode[attr], projectionNode[attr], attributes[attr].ref, "" + path + attr + "/");
                    }
                }
                else {
                    // there must exist one homonymous 'as' in function call.
                    var fnCalls = Object.keys(projectionNode).filter(function (pAttr) { return pAttr.toLowerCase().startsWith('$fncall'); });
                    var asS = fnCalls.map(function (fnCall) { return projectionNode[fnCall].$as; });
                    var asS2 = asS.concat((Object.keys(projectionNode).filter(function (k) { return typeof projectionNode[k] === 'string'; })).map(function (k) { return projectionNode[k]; }));
                    if (!asS2.includes(attr)) {
                        throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.sortAttrUnexisted, "sort attribute " + path + attr + " unexisted in projection", {
                            path: path,
                            attr: attr,
                        });
                    }
                }
            });
        };
        checkInProjection(merged, projection, entity, './');
    };
    SqlTranslator.prototype.translateProjection = function (entity, projection, aliasDict) {
        var _this = this;
        var schema = this.schema;
        var translateInner = function (entity2, projection2, path) {
            var alias = aliasDict[path];
            var attributes = schema[entity2].attributes;
            var projText = '';
            var prefix = path.slice(2).replace(/\//g, '.');
            Object.keys(projection2).forEach(function (attr, idx) {
                if (attr.toLowerCase().startsWith('$fncall')) {
                    // functionCall
                    projText += _this.translateFnCall(projection2[attr], alias, prefix);
                }
                else {
                    var _a = attributes[attr], type = _a.type, ref = _a.ref;
                    if (type === 'ref') {
                        projText += translateInner(ref, projection2[attr], "" + path + attr + "/");
                    }
                    else if (projection2[attr] === 1) {
                        projText += " " + _this.translateAttrProjection(type, alias, attr) + " as `" + prefix + attr + "`";
                    }
                    else {
                        console_1.assert(typeof projection2[attr] === 'string');
                        if (projection2[attr].startsWith('$$')) {
                            projText += " " + _this.translateAttrProjection(type, alias, attr) + " as `" + projection2[attr].slice(2) + "`";
                        }
                        else {
                            projText += " " + _this.translateAttrProjection(type, alias, attr) + " as `" + prefix + projection2[attr] + "`";
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
    };
    SqlTranslator.prototype.translateGroupBy = function (entity, groupBy, aliasDict) {
        var schema = this.schema;
        var translateInner = function (entity2, groupBy2, path) {
            var alias = aliasDict[path];
            var attributes = schema[entity2].attributes;
            var groupByText = '';
            Object.keys(groupBy2).forEach(function (attr, idx) {
                var _a = attributes[attr], type = _a.type, ref = _a.ref;
                if (type === 'ref') {
                    groupByText += translateInner(ref, groupBy2[attr], "" + path + attr + "/");
                }
                else {
                    console_1.assert(groupBy2[attr] === 1);
                    groupByText += " `" + alias + "`.`" + attr + "`";
                }
                if (idx < Object.keys(groupBy2).length - 1) {
                    groupByText += ',';
                }
            });
            return groupByText;
        };
        return translateInner(entity, groupBy, './');
    };
    SqlTranslator.prototype.translateWhere = function (entity, query, aliasDict) {
        var _this = this;
        var schema = this.schema;
        var translateInner = function (entity2, query2, path, type) {
            var alias = aliasDict[path];
            var attributes = schema[entity2].attributes;
            var whereText = '';
            Object.keys(query2).forEach(function (attr, idx) {
                if (Operator_1.LogicOperators.includes(attr)) {
                    var result = '';
                    switch (attr) {
                        case '$and':
                        case '$or':
                        case '$xor': {
                            var logicQueries_1 = query2[attr];
                            logicQueries_1.forEach(function (logicQuery, index) {
                                var sql = translateInner(entity2, logicQuery, path);
                                if (sql) {
                                    whereText += " (" + sql + ")";
                                    if (index < logicQueries_1.length - 1) {
                                        whereText += " " + attr.slice(1);
                                    }
                                }
                            });
                            break;
                        }
                        case '$not': {
                            var logicQuery = query2[attr];
                            var sql = translateInner(entity2, logicQuery, path);
                            if (sql) {
                                whereText += " not (" + translateInner(entity2, logicQuery, path) + ")";
                                break;
                            }
                        }
                        default: {
                            console_1.assert(false);
                            return '';
                        }
                    }
                }
                else if (attr.toLowerCase().startsWith('$fncall')) {
                    // functionCall
                    whereText += " (" + _this.translateFnCall(query2[attr], alias) + ")";
                }
                else if (Operator_1.ComparisonOperators.includes(attr)) {
                    whereText += _this.translateComparison(attr, query2[attr], type);
                }
                else if (Operator_1.ElementOperators.includes(attr)) {
                    whereText += _this.translateElement(attr, query2[attr]);
                }
                else if (Operator_1.EvaluationOperators.includes(attr)) {
                    whereText += _this.translateEvaluation(attr, query2[attr], entity2, alias, type);
                }
                else if (Operator_1.SpatialOperators.includes(attr)) {
                    throw new Error('暂不支持的算子');
                }
                else {
                    console_1.assert(attributes.hasOwnProperty(attr));
                    var _a = attributes[attr], type2 = _a.type, ref = _a.ref;
                    if (type2 === 'ref') {
                        whereText += " " + translateInner(ref, query2[attr], "" + path + ref + "/");
                    }
                    else if (typeof query2[attr] === 'object' && Object.keys(query2[attr])[0] && Object.keys(query2[attr])[0].startsWith('$')) {
                        whereText += " `" + alias + "`.`" + attr + "` " + translateInner(entity2, query2[attr], path, type2);
                    }
                    else {
                        whereText += " `" + alias + "`.`" + attr + "` = " + _this.translateAttrValue(type2, query2[attr]);
                    }
                }
                if (idx < Object.keys(query2).length - 1) {
                    whereText += ' and';
                }
            });
            return whereText;
        };
        return translateInner(entity, query, './');
    };
    SqlTranslator.prototype.translateSort = function (entity, sort, aliasDict) {
        var _this = this;
        var schema = this.schema;
        var translateInner = function (entity2, sortAttr, path) {
            var attr = Object.keys(sortAttr)[0];
            var alias = aliasDict[path];
            var attributes = schema[entity2].attributes;
            var prefix = path.slice(2).replace(/\//g, '.');
            if (attr.toLocaleLowerCase().startsWith('$fncall')) {
                return _this.translateFnCall(sortAttr[attr], alias, prefix);
            }
            else if (sortAttr[attr] === 1) {
                return " `" + alias + "`.`" + attr + "`";
            }
            else {
                var _a = attributes[attr], ref = _a.ref, type = _a.type;
                console_1.assert(type === 'ref');
                return translateInner(ref, sortAttr[attr], "" + path + attr + "/");
            }
        };
        var sortText = '';
        sort.forEach(function (sortNode, index) {
            var $attr = sortNode.$attr, $direction = sortNode.$direction;
            sortText += translateInner(entity, $attr, './');
            if ($direction) {
                sortText += " " + $direction;
            }
            if (index < sort.length - 1) {
                sortText += ',';
            }
        });
        return sortText;
    };
    SqlTranslator.prototype.translateSelect = function (_a) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, indexFrom = _a.indexFrom, count = _a.count, sort = _a.sort, forUpdate = _a.forUpdate, groupBy = _a.groupBy;
        var projection2 = this.formalizeProjection(entity, projection);
        if (sort) {
            this.checkSortWithProjection(entity, projection2, sort);
        }
        var _b = this.analyzeJoin({
            entity: entity,
            projection: projection2,
            query: query,
            sort: sort,
        }), fromText = _b.from, aliasDict = _b.aliasDict;
        var projText = this.translateProjection(entity, projection2, aliasDict);
        var sql = "select " + projText + " from " + fromText;
        if (query) {
            var sqlWhere = this.translateWhere(entity, query, aliasDict);
            if (sqlWhere) {
                sql += " where " + sqlWhere;
            }
        }
        if (sort) {
            var sortText = this.translateSort(entity, sort, aliasDict);
            if (sortText) {
                sql += " order by " + sortText;
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
            sql += " group by " + this.translateGroupBy(entity, groupBy, aliasDict);
        }
        return sql;
    };
    /**
     * update table t1 set t1.a1 = v1 where (id = 1)/(t1.a2 = v2);
     * @param param0
     */
    SqlTranslator.prototype.translateUpdate = function (_a) {
        var _this = this;
        var entity = _a.entity, data = _a.data, id = _a.id, query = _a.query;
        var schema = this.schema;
        var _b = schema[entity], attributes = _b.attributes, _c = _b.storageName, storageName = _c === void 0 ? entity : _c;
        var sql = "update `" + storageName + "` `" + entity + "` set";
        var attrs = Object.keys(data);
        attrs.forEach(function (attr, attrIdx) {
            var attrDef = attributes[attr];
            var dataType = attrDef.type;
            var value = _this.translateAttrValue(dataType, data[attr]);
            sql += " `" + attr + "` = " + value;
            if (attrIdx < attrs.length - 1) {
                sql += ',';
            }
        });
        if (id) {
            sql += " where id = " + id;
        }
        else if (query) {
            var whereText = this.translateWhere(entity, query, {
                './': entity,
            });
            sql += " where " + whereText;
        }
        return sql;
    };
    SqlTranslator.prototype.translateRemove = function (_a) {
        var entity = _a.entity, id = _a.id, query = _a.query;
        var schema = this.schema;
        var _b = schema[entity], attributes = _b.attributes, _c = _b.storageName, storageName = _c === void 0 ? entity : _c;
        var sql = "delete from " + storageName + " " + entity;
        if (id) {
            sql += " where id = " + id;
        }
        else if (query) {
            var whereText = this.translateWhere(entity, query, {
                './': entity,
            });
            sql += whereText;
        }
        return sql;
    };
    return SqlTranslator;
}(Translator_1.Translator));
exports.SqlTranslator = SqlTranslator;
