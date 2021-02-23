import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';
import { Row } from '../src/types/Result';
import { Trigger } from '../src/warden';
import { assign } from 'lodash';
import { assert } from 'console';

describe('test remove', function() {
    this.timeout(100000);
    let oakDb: OakDb;
    let user: Row;

    before(async () => {
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.create({
                entity: 'user',
                data: {
                    name: 'wkj',
                    born: new Date('1989-11-10'),
                },
                txn,
            });
            user = await oakDb.create({
                entity: 'user',
                data: {
                    name: 'xc',
                    born: new Date('1983-11-10'),
                },
                txn,
            });
            await oakDb.create({
                entity: 'homework',
                data: {
                    mark: 100,
                    title: 'english',
                    content: 'aaaaa',
                    userId: user.id,
                },
                txn,
            })
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }

    });

    it ('test simple remove', async () => {
        const removed = await oakDb.removeMany({
            entity: 'user',
            query: {
                name: 'wkj',
            },
        });
        console.log(removed);
        const users = await oakDb.find({
            entity: 'user',
        });
        assert(users.length === 1);
    });    

    after(async() => {
        await disconnectOakDbInstance(oakDb);
    });

    it ('test remove trigger', async () => {
        const trigger:Trigger = {
            name: 'when delete user, delete his homework sychonously',
            entity: 'user',
            action: 'remove',
            fn: async ({ triggeredRow, txn }) => {
                return await oakDb.remove({
                    entity: 'homework',
                    id: (triggeredRow as Row).id,
                    txn,
                });
            },
            triggerEntity: 'homework',
            triggerCondition: async ({ row }) => {
                return {
                    userId: (row as Row).id,
                };
            },
            triggerProjection: {
                id: 1,
            },
        };
        oakDb.registerTrigger(trigger);

        const txn = await oakDb.startTransaction();
        try {
            const h1 = await oakDb.find({
                entity: 'homework',
                query: {
                    userId: user.id,
                },
                txn,
            });
            assert(h1.length === 1);
            const removed = await oakDb.remove({
                entity: 'user',
                id: user.id,
                txn,
            });
            console.log(removed);
            await oakDb.commitTransaction(txn);
        }
        catch(err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
        const h1 = await oakDb.find({
            entity: 'homework',
            query: {
                userId: user.id,
            },
        });
        assert(h1.length === 0);
    });
});