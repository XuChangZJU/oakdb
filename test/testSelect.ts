import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';

describe('test select', function() {
    this.timeout(10000);
    let oakDb: OakDb;

    before(async () => {
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);

        const txn = await oakDb.startTransaction();
        try {
            const user = await oakDb.create({
                entity: 'user',
                data: {
                    name: 'xc',
                    born: new Date('1983-11-10'),
                },
                txn,
            });
            console.log(user);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
    });

    it ('test select row', async () => {
        console.log('select');
    });

    after(async () => {
        if (oakDb) {
            await disconnectOakDbInstance(oakDb);
        }
    });
});