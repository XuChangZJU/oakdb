import { TranslateResult } from './translate-result/TranslateResult';
// import { Query } from '../types/Query';
import { Projection } from '../types/Projection';
import { Data } from '../types/Result';
import { Schema } from '../Schema';
import { DataType } from '../DataType';
import { DataTypeDefaults, DataTypeParams } from '../DataTypeDefaults';
import { Query } from '../types/Query';
import { GroupBy } from '../types/GroupBy';

export abstract class Translator {
    readonly schema: Schema;

    constructor(schema: Schema) {
        this.schema = schema;
    }
    /**
     * Gets list of supported column data types by a driver.
     */
    static supportedDataTypes: DataType[];

    /**
     * Gets list of spatial column data types.
     */
    static spatialTypes: DataType[];

    /**
     * Gets list of column data types that support length by a driver.
     */
    static withLengthDataTypes: DataType[];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    static withPrecisionDataTypes: DataType[];

    /**
     * Gets list of column data types that support scale by a driver.
     */
    static withScaleDataTypes: DataType[];

    
    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    static dataTypeDefaults: DataTypeDefaults;
    

    /**
     * Max length allowed by the DBMS for aliases (execution of queries).
     */
    maxAliasLength?: number;


    /**
     * 创建单个entity
     * @param entity 对象名
     * @param options 创建参数
     */
    abstract translateCreateEntity(entity: string, options: any): TranslateResult;

    abstract translateDestroyEntity(entity: string, options: any): TranslateResult;

    abstract translateInsertRow(entity: string, data: Data[]): TranslateResult;

    abstract translateSelect({ entity, projection, query, indexFrom, count, forUpdate, groupBy }: {
        entity: string;
        projection?: Projection | undefined;
        query?: Query | undefined;
        indexFrom?: number | undefined;
        count?: number | undefined;
        forUpdate?: boolean | undefined;
        groupBy?: GroupBy;
    }): TranslateResult;

    abstract translateUpdate({ entity, data, id, query }: {
        entity: string;
        data: Data;
        id?: string | number;
        query?: Query;
    }): TranslateResult;
}