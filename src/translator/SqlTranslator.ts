import { Translator } from './Translator';
import { Data, Value } from '../types/Result';
import { DataType } from '../DataType';

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
}