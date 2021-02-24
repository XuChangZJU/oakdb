"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
describe('test oakdb', function () {
    this.timeout(10000);
    it('test initDb', async () => {
        const oakDb = await init_1.initOakDbInstance(schema_1.schemaTestCreate, source_1.mysql, true, true, undefined, true);
        await init_1.disconnectOakDbInstance(oakDb);
    });
});
