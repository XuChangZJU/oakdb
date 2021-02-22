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

describe('test update', function() {
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

    it ('test simple update', async () => {
        const updated = await oakDb.update({
            entity: 'user',
            id: user.id,
            data: {
                born: (new Date()),
            },
        });
        console.log(updated);
    });

    it ('test update many', async () => {
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.updateMany({
                entity: 'user',
                data: {
                    born: new Date(),
                },
                query: {
                    id: {
                        $in: [1, 2, 3, 4],
                    },
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
    });

    it ('test update trigger', async () => {
        const trigger:Trigger = {
            name: 'when update homework\'s title, change its mark to zero',
            entity: 'homework',
            action: 'update',
            attributes: ['title'],
            valueCheck: ({ row, data }) => data.title && (!row || row.title !== data.title),
            before: true,
            fn: async ({ row, data, txn }) => {
                assign(data, {
                    mark: 0,
                });
                return 1;
            },
        };

        oakDb.registerTrigger(trigger);
        const txn = await oakDb.startTransaction();
        try {
            const [ homework ] = await oakDb.find({
                entity: 'homework',
                indexFrom: 0,
                count: 1,
                txn,
            });
            console.log(homework);

            const updateResult = await oakDb.update({
                entity: 'homework',
                data: {
                    title: homework.title + 'aaa',
                },
                id: homework.id,
                txn,
            });
            console.log(updateResult);

            const homework2 = await oakDb.findById({
                entity: 'homework',
                id: homework.id,
                txn,
            });

            console.log(homework2);
            assert(homework2.mark === 0);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }

        await disconnectOakDbInstance(oakDb);
    });

    after(async() => {
        await disconnectOakDbInstance(oakDb);
    });
});