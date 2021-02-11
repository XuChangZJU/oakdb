import { Translator } from './Translator';

export abstract class SqlTranslator extends Translator {
    translateDestroyEntity(entity: string, truncate?: boolean):string {
        const { schema } = this;
        const { storageName = entity } = schema[entity];
        
        const sql = truncate ? `truncate table ${storageName}`: `drop table if exists ${storageName}`;

        return sql;
    }
}