"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
class Driver {
    constructor(options, schema) {
        this.options = options;
        this.schema = schema;
    }
}
exports.Driver = Driver;
