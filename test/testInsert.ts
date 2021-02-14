import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';

describe('test insert', function() {
    this.timeout(10000);
    it ('test insert row', async () => {
        const oakDb: OakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);

        const txn = await oakDb.startTransaction();
        try {
            await oakDb.create({
                entity: 'user',
                data: {
                    name: 'xc',
                    born: new Date('1983-11-10'),
                },
                txn,
            });
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }

        await disconnectOakDbInstance(oakDb);
    })
});