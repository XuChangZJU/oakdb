import { describe, it } from 'mocha';
import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';

describe('test oakdb create', function() {
    this.timeout(10000);
    it ('test initDb', async () => {
        const oakDb: OakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);

        await disconnectOakDbInstance(oakDb);
    })
});