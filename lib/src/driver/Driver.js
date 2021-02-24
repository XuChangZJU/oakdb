"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
// import {QueryRunner} from "../query-runner/QueryRunner";
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
class Driver {
    constructor(options, schema) {
        this.options = options;
        this.schema = cloneDeep_1.default(schema);
    }
}
exports.Driver = Driver;
