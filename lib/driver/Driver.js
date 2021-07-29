"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
var Driver = /** @class */ (function () {
    function Driver(options, schema, log) {
        this.options = options;
        this.schema = schema;
        this.log = log || console.log;
    }
    return Driver;
}());
exports.Driver = Driver;
