"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
const console_1 = require("console");
describe('test remove', function () {
    this.timeout(100000);
    let oakDb;
    let user;
    before(async () => {
        oakDb = await init_1.initOakDbInstance(schema_1.schemaTestCreate, source_1.mysql, true, true, undefined, true);
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
            });
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
    });
    it('test simple remove', async () => {
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
        console_1.assert(users.length === 1);
    });
    after(async () => {
        await init_1.disconnectOakDbInstance(oakDb);
    });
    it('test remove trigger', async () => {
        const trigger = {
            name: 'when delete user, delete his homework sychonously',
            entity: 'user',
            action: 'remove',
            fn: async ({ triggeredRow, txn }) => {
                return await oakDb.remove({
                    entity: 'homework',
                    id: triggeredRow.id,
                    txn,
                });
            },
            triggerEntity: 'homework',
            triggerCondition: async ({ row }) => {
                return {
                    userId: row.id,
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
            console_1.assert(h1.length === 1);
            const removed = await oakDb.remove({
                entity: 'user',
                id: user.id,
                txn,
            });
            console.log(removed);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
        const h1 = await oakDb.find({
            entity: 'homework',
            query: {
                userId: user.id,
            },
        });
        console_1.assert(h1.length === 0);
    });
});
