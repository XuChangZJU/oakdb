"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
class Driver {
    constructor(options, schema, log) {
        this.options = options;
        this.schema = schema;
        this.log = log || console.log;
    }
}
exports.Driver = Driver;
