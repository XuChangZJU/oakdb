"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var lodash_1 = require("lodash");
exports.ErrorCode = {
    databaseError: 1000,
    sortAttrUnexisted: 150001,
    dataFormatError: 150002,
    uniqueConstraintViolated: 150003,
    notNullConstraintViolated: 150004,
    volatileTriggerUncompleted: 150005,
    deadlockDetected: 150006,
    lockWaitTimeout: 150007,
    unsupportedYet: 200000,
    createError: function (code, message, params) {
        var error = new Error(message);
        lodash_1.assign(error, { code: code, params: params });
        return error;
    }
};
