"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectOakDbInstance = exports.initOakDbInstance = void 0;
const index_1 = require("../../src/index");
async function initOakDbInstance(schema, source, init, replace, excludes, destroy, destroyExcludes, truncate) {
    const oakDb = new index_1.OakDb(schema, source);
    await oakDb.connect();
    if (destroy) {
        await oakDb.destroy(truncate, destroyExcludes);
    }
    if (init) {
        await oakDb.init(replace, excludes);
    }
    return oakDb;
}
exports.initOakDbInstance = initOakDbInstance;
async function disconnectOakDbInstance(oakDb) {
    await oakDb.disconnect();
}
exports.disconnectOakDbInstance = disconnectOakDbInstance;
