import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';

describe('test insert', function() {
    this.timeout(100000);
    let oakDb: OakDb;

    before(async () => {
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);
    });

    it ('test insert row', async () => {
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
    });

    it ('test insert many', async () => {
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.createMany({
                entity: 'user',
                data: [{
                    name: 'xc',
                    born: new Date('1983-11-10'),
                },{
                    name: 'gjj',
                    born: new Date('1998-12-11'),
                }],
                txn,
            }, true);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }

    });

    after(async() => {
        await disconnectOakDbInstance(oakDb);
    });
});