import { SqlTranslator } from './SqlTranslator';
import { SqlResult } from './translate-result/TranslateResult';
import { DataType } from '../DataType';
import { DataTypeDefaults, DataTypeParams } from '../DataTypeDefaults';
import { Data, Value } from '../types/Result';

export class MySQLTranslator extends SqlTranslator {
    static supportedDataTypes: DataType[] = [
        // numeric types
        "bit",
        "int",
        "integer",          // synonym for int
        "tinyint",
        "smallint",
        "mediumint",
        "bigint",
        "float",
        "double",
        "double precision", // synonym for double
        "real",             // synonym for double
        "decimal",
        "dec",              // synonym for decimal
        "numeric",          // synonym for decimal
        "fixed",            // synonym for decimal
        "bool",             // synonym for tinyint
        "boolean",          // synonym for tinyint
        // date and time types
        "date",
        "datetime",
        "timestamp",
        "time",
        "year",
        // string types
        "char",
        "nchar",            // synonym for national char
        "national char",
        "varchar",
        "nvarchar",         // synonym for national varchar
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

    static spatialTypes: DataType[] = [
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection"
    ];

    static withLengthDataTypes: DataType[] = [
        "char",
        "varchar",
        "nvarchar",
        "binary",
        "varbinary"
    ];

    static withPrecisionDataTypes: DataType[] = [
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

    static withScaleDataTypes: DataType[] = [
        "decimal",
        "dec",
        "numeric",
        "fixed",
        "float",
        "double",
        "double precision",
        "real"
    ];

    static unsignedAndZerofillTypes: DataType[] = [
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

    static dataTypeDefaults: DataTypeDefaults = {
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

    maxAliasLength = 63;

    populateDataTypeDef(type: DataType, params?: DataTypeParams): string{
        if (MySQLTranslator.withLengthDataTypes.includes(type)) {
            if (params) {
                const { length } = params;
                return `${type}(${length}) `;
            }
            else {
                const { length } = MySQLTranslator.dataTypeDefaults[type as string];
                return `${type}(${length}) `;
            }
        }

        if (MySQLTranslator.withPrecisionDataTypes.includes(type)) {
            if (params) {
                const { precision, scale } = params;
                return `${type}(${precision}, ${scale}) `;
            }
            else {
                const { precision, scale } = MySQLTranslator.dataTypeDefaults[type as string];
                return `${type}(${precision}, ${scale}) `;
            }
        }

        if (['date'].includes(type as string)) {
            return 'bigint ';        // 因为历史原因，date类型用bigint存，Date.now()
        }
        if (['object', 'array'].includes(type as string)) {
            return 'json ';
        }
        if (['image'].includes(type as string)) {
            return 'text ';
        }

        return `${type} `;
    }

    translateCreateEntity(entity: string, 
        { replace = false, }: { replace: boolean }
        ): SqlResult {
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
        Object.keys(attributes).forEach(
            (attr, idx) => {
                const attrDef = attributes[attr];
                const {
                    type,
                    params,
                    default: defaultValue,
                    unique,
                    notNull,                    
                } = attrDef;
                if (type === 'ref') {
                    return;
                }
                sql += `\`${attr}\` `
                sql += this.populateDataTypeDef(type, params) as string;

                if (notNull) {
                    sql += 'not null ';
                }
                if (unique) {
                    sql += 'unique ';
                }
                if (defaultValue) {
                    sql += `default ${defaultValue}`;
                }
                if (attr === 'id') {
                    sql += 'primary key auto_increment '
                }
                if (idx < Object.keys(attributes).length - 1) {
                    sql += ',\n';
                }
            }
        );

        // 翻译索引信息
        if (indexes) {
            sql += ',\n';
            indexes.forEach(
                ({ name, columns, config }, idx) => {
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

                    columns.forEach(
                        ({name, size, direction}, idx2) => {
                            sql += `\`${name}\``;
                            if (size) {
                                sql +=` (${size})`;
                            }
                            if (direction) {
                                sql += ` ${direction}`;
                            }
                            if (idx2 < columns.length - 1) {
                                sql += ','
                            }
                        }
                    );
                    sql += ')';
                    if (parser) {
                        sql += ` with parser ${parser}`;
                    }
                    if (idx < indexes.length - 1) {
                        sql += ',\n';
                    }
                }
            );
        }
        sql += ')';
        
        return sql;
    }

    translateAttrValue(attr: string, dataType: DataType, value: Data | Value ): string {
        switch (dataType) {
            case 'geometry': {
                const { type, coordinates } = value;
                // const type = value.type;
                // const coordinates = value.coordinates;
                return `ST_GeomFromText('${type}(${coordinates[0], coordinates[1]})')`;
            }
            case 'date': {
                if (value instanceof Date) {
                    return `${value.valueOf()}`;
                }
                else if (typeof value === 'number') {
                    return `${value}`;
                }
                return value as string;
            }
            case 'object':
            case 'array': {
                return `'${JSON.stringify(value)}'`;
            }
            default: {
                if (typeof value === 'string') {
                    return `'${value}'`;
                }
                return value as string;
            }
        }
    }


}