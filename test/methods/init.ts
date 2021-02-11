import { Schema } from '../../src/Schema';
import { Source } from '../../src/source/Source';
import { OakDb } from '../../src/index';

export async function initOakDbInstance(
    schema: Schema,
    source: Source,
    init?: boolean,
    replace?: boolean,
    excludes?: string[],
    destroy?: boolean,
    destroyExcludes?: string[],
    truncate?: boolean,
): Promise<OakDb> {
    const oakDb = new OakDb(schema, source);
    await oakDb.connect();
    
    if (destroy) {
        await oakDb.destroy(truncate, destroyExcludes);
    }

    if (init) {
        await oakDb.init(replace, excludes);
    }
    
    return oakDb;
}

export async function disconnectOakDbInstance(oakDb: OakDb) {
    await oakDb.disconnect();
}