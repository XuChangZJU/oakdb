import { SqlTranslator } from './SqlTranslator';
import { SqlResult } from './translate-result/TranslateResult';
import { DataType } from '../DataType';
import { DataTypeDefaults, DataTypeParams } from '../DataTypeDefaults';
import { Data, Value } from '../types/Result';
import { FullTextSearchQuery } from '../types/Query';
export declare class MySQLTranslator extends SqlTranslator {
    static supportedDataTypes: DataType[];
    static spatialTypes: DataType[];
    static withLengthDataTypes: DataType[];
    static withPrecisionDataTypes: DataType[];
    static withScaleDataTypes: DataType[];
    static unsignedAndZerofillTypes: DataType[];
    static dataTypeDefaults: DataTypeDefaults;
    maxAliasLength: number;
    populateDataTypeDef(type: DataType, params?: DataTypeParams): string;
    translateCreateEntity(entity: string, { replace, }: {
        replace: boolean;
    }): SqlResult;
    translateAttrProjection(dataType: DataType, alias: string, attr: string): string;
    translateAttrValue(dataType: DataType, value: Data | Value): string;
    translateFullTextSearch(value: FullTextSearchQuery, entity: string, alias: string): string;
    translateIndexFromCount(indexFrom: number, count: number): string;
    translateForUpdate(): string;
}
