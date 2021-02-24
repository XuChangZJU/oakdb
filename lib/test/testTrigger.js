"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
describe('test trigger', function () {
    this.timeout(1000000);
    it('test volatile trigger', async () => {
        const oakDb = await init_1.initOakDbInstance(schema_1.schemaTestCreate, source_1.mysql, true, true, undefined, true);
        let count = 0;
        const volatileTrigger = {
            name: 'test volatile trigger',
            volatile: 'makeSure',
            entity: 'user',
            action: 'insert',
            fn: async ({ data, txn }) => {
                count++;
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
        await new Promise((resolve, reject) => {
            setTimeout(resolve, 2000);
        });
        console.log(111);
        console.log(Date.now());
        await oakDb.patrol(1000);
        console.log(222);
        await init_1.disconnectOakDbInstance(oakDb);
    });
});
