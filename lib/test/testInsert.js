"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
describe('test insert', function () {
    this.timeout(100000);
    let oakDb;
    before(async () => {
        oakDb = await init_1.initOakDbInstance(schema_1.schemaTestCreate, source_1.mysql, true, true, undefined, true);
    });
    it('test insert row', async () => {
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
    it('test insert many', async () => {
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.createMany({
                entity: 'user',
                data: [{
                        name: 'xc',
                        born: new Date('1983-11-10'),
                    }, {
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
    after(async () => {
        await init_1.disconnectOakDbInstance(oakDb);
    });
});
