"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLTranslator = void 0;
const SqlTranslator_1 = require("./SqlTranslator");
const assert_1 = __importDefault(require("assert"));
const errorCode_1 = require("../errorCode");
const GeoTypes = [
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
        let result = "GeometryCollection(";
        data.coordinates.forEach((ele, idx) => {
            if (idx > 0) {
                result += ",";
            }
            result += transformGeoData(ele);
        });
        result += ")";
        return result;
    }
    else {
        const type = GeoTypes.find((ele) => {
            return ele.name.toLowerCase() === data.type.toLowerCase();
        });
        if (!type) {
            throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.dataFormatError, `${data.type} is not a valid geo data`, type);
        }
        let result = type.name + "(";
        data.coordinates.forEach((ele, idx) => {
            if (idx > 0) {
                result += ",";
            }
            if (type.element) {
                result += transformGeoData({
                    type: type.element,
                    coordinates: ele
                });
            }
            else {
                result += new String(ele);
            }
        });
        result += ")";
        return result;
    }
}
class MySQLTranslator extends SqlTranslator_1.SqlTranslator {
    constructor() {
        super(...arguments);
        this.maxAliasLength = 63;
    }
    populateDataTypeDef(type, params) {
        if (MySQLTranslator.withLengthDataTypes.includes(type)) {
            if (params) {
                const { length } = params;
                return `${type}(${length}) `;
            }
            else {
                const { length } = MySQLTranslator.dataTypeDefaults[type];
                return `${type}(${length}) `;
            }
        }
        if (MySQLTranslator.withPrecisionDataTypes.includes(type)) {
            if (params) {
                const { precision, scale } = params;
                if (typeof scale === 'number') {
                    return `${type}(${precision}, ${scale}) `;
                }
                return `${type}(${precision})`;
            }
            else {
                const { precision, scale } = MySQLTranslator.dataTypeDefaults[type];
                if (typeof scale === 'number') {
                    return `${type}(${precision}, ${scale}) `;
                }
                return `${type}(${precision})`;
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
        return `${type} `;
    }
    translateCreateEntity(entity, { replace = false, }) {
        const { schema } = this;
        const entityDef = schema[entity];
        let sql = !replace ? 'create table if not exists ' : 'create table ';
        const { storageName, attributes, indexes } = entityDef;
        if (storageName) {
            sql += `\`${storageName}\` (`;
        }
        else {
            sql += `\`${entity}\` (`;
        }
        // 翻译所有的属性
        Object.keys(attributes).forEach((attr, idx) => {
            const attrDef = attributes[attr];
            const { type, params, default: defaultValue, unique, notNull, } = attrDef;
            if (type === 'ref') {
                return;
            }
            sql += `\`${attr}\` `;
            sql += this.populateDataTypeDef(type, params);
            if (notNull) {
                sql += 'not null ';
            }
            if (unique) {
                sql += 'unique ';
            }
            if (defaultValue) {
                sql += `default ${this.translateAttrValue(type, defaultValue)}`;
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
            indexes.forEach(({ name, columns, config }, idx) => {
                const { unique, type, parser } = config || {};
                if (unique) {
                    sql += 'unique ';
                }
                else if (type === 'fulltext') {
                    sql += 'fulltext ';
                }
                else if (type === 'spatial') {
                    sql += 'spatial ';
                }
                sql += `index ${name} `;
                if (type === 'hash') {
                    sql += `using hash `;
                }
                sql += '(';
                columns.forEach(({ name, size, direction }, idx2) => {
                    sql += `\`${name}\``;
                    if (size) {
                        sql += ` (${size})`;
                    }
                    if (direction) {
                        sql += ` ${direction}`;
                    }
                    if (idx2 < columns.length - 1) {
                        sql += ',';
                    }
                });
                sql += ')';
                if (parser) {
                    sql += ` with parser ${parser}`;
                }
                if (idx < indexes.length - 1) {
                    sql += ',\n';
                }
            });
        }
        sql += ')';
        return sql;
    }
    translateAttrProjection(dataType, alias, attr) {
        switch (dataType) {
            case 'geometry': {
                return `st_astext(\`${alias}\`.\`${attr}\`)`;
            }
            default: {
                return `\`${alias}\`.\`${attr}\``;
            }
        }
    }
    translateAttrValue(dataType, value) {
        if (value === null) {
            return 'null';
        }
        switch (dataType) {
            case 'geometry': {
                return transformGeoData(value);
            }
            case 'date': {
                if (value instanceof Date) {
                    return `${value.valueOf()}`;
                }
                else if (typeof value === 'number') {
                    return `${value}`;
                }
                return value;
            }
            case 'object':
            case 'array': {
                return `'${JSON.stringify(value)}'`;
            }
            case 'function': {
                return `'${Buffer.from(value.toString()).toString('base64')}'`;
            }
            default: {
                if (typeof value === 'string') {
                    return `'${value}'`;
                }
                return value;
            }
        }
    }
    translateFullTextSearch(value, entity, alias) {
        const { $search } = value;
        const { indexes } = this.schema[entity];
        const ftIndex = indexes && indexes.find((ele) => {
            const { config } = ele;
            return config && config.type === 'fulltext';
        });
        assert_1.default(ftIndex);
        const { columns } = ftIndex;
        const columns2 = columns.map(({ name }) => `${alias}.${name}`);
        return ` match(${columns2.join(',')}) against ('${$search}' in natural language mode)`;
    }
    translateIndexFromCount(indexFrom, count) {
        return ` limit ${indexFrom}, ${count}`;
    }
    translateForUpdate() {
        return ' for update';
    }
}
exports.MySQLTranslator = MySQLTranslator;
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
