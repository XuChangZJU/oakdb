"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Txn = void 0;
const events_1 = __importDefault(require("events"));
class Txn extends events_1.default {
    constructor(id, data) {
        super();
        this.id = id;
        this.data = data;
    }
}
exports.Txn = Txn;
