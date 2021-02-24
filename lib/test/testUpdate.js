"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
const lodash_1 = require("lodash");
const console_1 = require("console");
describe('test update', function () {
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
    it('test simple update', async () => {
        const updated = await oakDb.update({
            entity: 'user',
            id: user.id,
            data: {
                born: (new Date()),
            },
        });
        console.log(updated);
    });
    it('test update many', async () => {
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
        await init_1.disconnectOakDbInstance(oakDb);
    });
    it('test update trigger', async () => {
        const trigger = {
            name: 'when update homework\'s title, change its mark to zero',
            entity: 'homework',
            action: 'update',
            attributes: ['title'],
            valueCheck: ({ row, data }) => !data || data.title && (!row || row.title !== data.title),
            before: true,
            fn: async ({ row, data, txn }) => {
                lodash_1.assign(data, {
                    mark: 0,
                });
                return 1;
            },
        };
        oakDb.registerTrigger(trigger);
        const txn = await oakDb.startTransaction();
        try {
            const [homework] = await oakDb.find({
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
            console_1.assert(homework2.mark === 0);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
        await init_1.disconnectOakDbInstance(oakDb);
    });
    after(async () => {
        await init_1.disconnectOakDbInstance(oakDb);
    });
});
