"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
const lodash_1 = require("lodash");
exports.ErrorCode = {
    volatileTriggerUncompleted: 1001,
    uniqueConstraintViolated: 1002,
    sortAttrUnexisted: 1500,
    dataFormatError: 1501,
    unsupportedYet: 2000,
    createError: (code, message, params) => {
        const error = new Error(message);
        lodash_1.assign(error, { code, params });
        return error;
    }
};
