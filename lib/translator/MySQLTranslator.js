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
exports.MySQLTranslator = void 0;
var SqlTranslator_1 = require("./SqlTranslator");
var assert_1 = __importDefault(require("assert"));
var errorCode_1 = require("../errorCode");
var GeoTypes = [
    {
        name: "Point"
    },
    {
        name: "LineString",
        element: "Point"
    },
    {
        name: "MultiLineString",
        element: "LineString"
    },
    {
        name: "Polygon",
        element: "LineString"
    },
    {
        name: "MultiPoint",
        element: "Point"
    },
    {
        name: "MultiPolygon",
        element: "Polygon"
    }
];
function transformGeoData(data) {
    if (data.type.toLowerCase() === "geometrycollection") {
        var result_1 = "GeometryCollection(";
        data.coordinates.forEach(function (ele, idx) {
            if (idx > 0) {
                result_1 += ",";
            }
            result_1 += transformGeoData(ele);
        });
        result_1 += ")";
        return result_1;
    }
    else {
        var type_1 = GeoTypes.find(function (ele) {
            return ele.name.toLowerCase() === data.type.toLowerCase();
        });
        if (!type_1) {
            throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.dataFormatError, data.type + " is not a valid geo data", type_1);
        }
        var result_2 = type_1.name + "(";
        data.coordinates.forEach(function (ele, idx) {
            if (idx > 0) {
                result_2 += ",";
            }
            if (type_1.element) {
                result_2 += transformGeoData({
                    type: type_1.element,
                    coordinates: ele
                });
            }
            else {
                result_2 += new String(ele);
            }
        });
        result_2 += ")";
        return result_2;
    }
}
var MySQLTranslator = /** @class */ (function (_super) {
    __extends(MySQLTranslator, _super);
    function MySQLTranslator() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.maxAliasLength = 63;
        return _this;
    }
    MySQLTranslator.prototype.populateDataTypeDef = function (type, params) {
        if (MySQLTranslator.withLengthDataTypes.includes(type)) {
            if (params) {
                var length_1 = params.length;
                return type + "(" + length_1 + ") ";
            }
            else {
                var length_2 = MySQLTranslator.dataTypeDefaults[type].length;
                return type + "(" + length_2 + ") ";
            }
        }
        if (MySQLTranslator.withPrecisionDataTypes.includes(type)) {
            if (params) {
                var precision = params.precision, scale = params.scale;
                if (typeof scale === 'number') {
                    return type + "(" + precision + ", " + scale + ") ";
                }
                return type + "(" + precision + ")";
            }
            else {
                var _a = MySQLTranslator.dataTypeDefaults[type], precision = _a.precision, scale = _a.scale;
                if (typeof scale === 'number') {
                    return type + "(" + precision + ", " + scale + ") ";
                }
                return type + "(" + precision + ")";
            }
        }
        if (['date'].includes(type)) {
            return 'bigint '; // 因为历史原因，date类型用bigint存，Date.now()
        }
        if (['object', 'array'].includes(type)) {
            return 'json ';
        }
        if (['image', 'function'].includes(type)) {
            return 'text ';
        }
        return type + " ";
    };
    MySQLTranslator.prototype.translateCreateEntity = function (entity, _a) {
        var _this = this;
        var _b = _a.replace, replace = _b === void 0 ? false : _b;
        var schema = this.schema;
        var entityDef = schema[entity];
        var storageName = entityDef.storageName, attributes = entityDef.attributes, indexes = entityDef.indexes, view = entityDef.view, as = entityDef.as;
        var entityType = view ? 'view' : 'table';
        var sql = !replace ? "create " + entityType + " if not exists " : "create " + entityType + " ";
        if (storageName) {
            sql += "`" + storageName + "` ";
        }
        else {
            sql += "`" + entity + "` ";
        }
        if (view && as) {
            sql += 'as (';
            var entity_1 = as.entity, projection = as.projection, query = as.query, groupBy = as.groupBy;
            sql += this.translateSelect({
                entity: entity_1,
                projection: projection,
                query: query,
                groupBy: groupBy,
            });
        }
        else {
            sql += '(';
            // 翻译所有的属性
            Object.keys(attributes).forEach(function (attr, idx) {
                var attrDef = attributes[attr];
                var type = attrDef.type, params = attrDef.params, defaultValue = attrDef.default, unique = attrDef.unique, notNull = attrDef.notNull;
                if (type === 'ref') {
                    return;
                }
                sql += "`" + attr + "` ";
                sql += _this.populateDataTypeDef(type, params);
                if (notNull) {
                    sql += 'not null ';
                }
                if (unique) {
                    sql += 'unique ';
                }
                if (defaultValue !== undefined) {
                    sql += "default " + _this.translateAttrValue(type, defaultValue);
                }
                if (attr === 'id') {
                    sql += 'primary key auto_increment ';
                }
                if (idx < Object.keys(attributes).length - 1) {
                    sql += ',\n';
                }
            });
            // 翻译索引信息
            if (indexes) {
                sql += ',\n';
                indexes.forEach(function (_a, idx) {
                    var name = _a.name, columns = _a.columns, config = _a.config;
                    var _b = config || {}, unique = _b.unique, type = _b.type, parser = _b.parser;
                    if (unique) {
                        sql += 'unique ';
                    }
                    else if (type === 'fulltext') {
                        sql += 'fulltext ';
                    }
                    else if (type === 'spatial') {
                        sql += 'spatial ';
                    }
                    sql += "index " + name + " ";
                    if (type === 'hash') {
                        sql += "using hash ";
                    }
                    sql += '(';
                    columns.forEach(function (_a, idx2) {
                        var name = _a.name, size = _a.size, direction = _a.direction;
                        sql += "`" + name + "`";
                        if (size) {
                            sql += " (" + size + ")";
                        }
                        if (direction) {
                            sql += " " + direction;
                        }
                        if (idx2 < columns.length - 1) {
                            sql += ',';
                        }
                    });
                    sql += ')';
                    if (parser) {
                        sql += " with parser " + parser;
                    }
                    if (idx < indexes.length - 1) {
                        sql += ',\n';
                    }
                });
            }
        }
        sql += ')';
        return sql;
    };
    MySQLTranslator.prototype.translateAttrProjection = function (dataType, alias, attr) {
        switch (dataType) {
            case 'geometry': {
                return "st_astext(`" + alias + "`.`" + attr + "`)";
            }
            default: {
                return "`" + alias + "`.`" + attr + "`";
            }
        }
    };
    MySQLTranslator.prototype.translateAttrValue = function (dataType, value) {
        if (value === null) {
            return 'null';
        }
        switch (dataType) {
            case 'geometry': {
                return transformGeoData(value);
            }
            case 'date': {
                if (value instanceof Date) {
                    return "" + value.valueOf();
                }
                else if (typeof value === 'number') {
                    return "" + value;
                }
                return value;
            }
            case 'object':
            case 'array': {
                return "'" + JSON.stringify(value) + "'";
            }
            case 'function': {
                return "'" + Buffer.from(value.toString()).toString('base64') + "'";
            }
            default: {
                if (typeof value === 'string') {
                    return "'" + value + "'";
                }
                return value;
            }
        }
    };
    MySQLTranslator.prototype.translateFullTextSearch = function (value, entity, alias) {
        var $search = value.$search;
        var indexes = this.schema[entity].indexes;
        var ftIndex = indexes && indexes.find(function (ele) {
            var config = ele.config;
            return config && config.type === 'fulltext';
        });
        assert_1.default(ftIndex);
        var columns = ftIndex.columns;
        var columns2 = columns.map(function (_a) {
            var name = _a.name;
            return alias + "." + name;
        });
        return " match(" + columns2.join(',') + ") against ('" + $search + "' in natural language mode)";
    };
    MySQLTranslator.prototype.translateIndexFromCount = function (indexFrom, count) {
        return " limit " + indexFrom + ", " + count;
    };
    MySQLTranslator.prototype.translateForUpdate = function () {
        return ' for update';
    };
    MySQLTranslator.supportedDataTypes = [
        // numeric types
        "bit",
        "int",
        "integer",
        "tinyint",
        "smallint",
        "mediumint",
        "bigint",
        "float",
        "double",
        "double precision",
        "real",
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "bool",
        "boolean",
        // date and time types
        "date",
        "datetime",
        "timestamp",
        "time",
        "year",
        // string types
        "char",
        "nchar",
        "national char",
        "varchar",
        "nvarchar",
        "national varchar",
        "blob",
        "text",
        "tinyblob",
        "tinytext",
        "mediumblob",
        "mediumtext",
        "longblob",
        "longtext",
        "enum",
        "set",
        "binary",
        "varbinary",
        // json data type
        "json",
        // spatial data types
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection"
    ];
    MySQLTranslator.spatialTypes = [
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection"
    ];
    MySQLTranslator.withLengthDataTypes = [
        "char",
        "varchar",
        "nvarchar",
        "binary",
        "varbinary"
    ];
    MySQLTranslator.withPrecisionDataTypes = [
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real",
        "time",
        "datetime",
        "timestamp"
    ];
    MySQLTranslator.withScaleDataTypes = [
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real"
    ];
    MySQLTranslator.unsignedAndZerofillTypes = [
        "int",
        "integer",
        "smallint",
        "tinyint",
        "mediumint",
        "bigint",
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real"
    ];
    MySQLTranslator.dataTypeDefaults = {
        "varchar": { length: 255 },
        "nvarchar": { length: 255 },
        "national varchar": { length: 255 },
        "char": { length: 1 },
        "binary": { length: 1 },
        "varbinary": { length: 255 },
        "decimal": { precision: 10, scale: 0 },
        "dec": { precision: 10, scale: 0 },
        "numeric": { precision: 10, scale: 0 },
        "fixed": { precision: 10, scale: 0 },
        "float": { precision: 12 },
        "double": { precision: 22 },
        "time": { precision: 0 },
        "datetime": { precision: 0 },
        "timestamp": { precision: 0 },
        "bit": { width: 1 },
        "int": { width: 11 },
        "integer": { width: 11 },
        "tinyint": { width: 4 },
        "smallint": { width: 6 },
        "mediumint": { width: 9 },
        "bigint": { width: 20 }
    };
    return MySQLTranslator;
}(SqlTranslator_1.SqlTranslator));
exports.MySQLTranslator = MySQLTranslator;
