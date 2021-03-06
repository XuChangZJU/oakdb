import { describe, it, before, after } from 'mocha';
import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';
import { Trigger } from '../src/warden';

describe('test trigger', function() {
    this.timeout(1000000);
    it ('test volatile trigger', async () => {
        const oakDb: OakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);

        let count = 0;
        const volatileTrigger: Trigger = {
            name: 'test volatile trigger',
            volatile: 'makeSure',
            entity: 'user',
            action: 'insert',
            fn: async ({ data, txn }) => {
                count ++;
                if (count === 1) {
                    throw new Error('fails at time 0.');
                }

                console.log(`count ${count}, let's go!`);
                return 1;
            },
        };
        oakDb.registerTrigger(volatileTrigger);
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
        console.log(Date.now());
        await new Promise(
            (resolve, reject) => {
                setTimeout(resolve, 2000);
            }
        );
        console.log(111);
        console.log(Date.now());
        await oakDb.patrol(1000);

        console.log(222);
        await disconnectOakDbInstance(oakDb);
    })
});