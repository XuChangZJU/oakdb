"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialUuid = exports.parallel = void 0;
const parallel = async (promises, formatErrorFn) => {
    const result = promises.map(() => false);
    const promises2 = promises.map(async (ele, idx) => {
        try {
            result[idx] = await ele;
        }
        catch (err) {
            if (formatErrorFn) {
                result[idx] = formatErrorFn(err);
            }
            else {
                result[idx] = err;
            }
        }
    });
    await Promise.all(promises2);
    if (formatErrorFn) {
        return result;
    }
    const firstFailure = result.find(ele => ele instanceof Error);
    if (firstFailure) {
        throw firstFailure;
    }
    return result;
};
exports.parallel = parallel;
const sha1 = require('sha1');
const os_1 = require("os");
let mac = '';
const adapters = os_1.networkInterfaces();
if (adapters) {
    Object.keys(adapters).forEach((ele) => {
        const adpater = adapters[ele];
        if (adpater) {
            adpater.forEach(adapter => {
                if (adapter.mac !== '00:00:00:00:00:00') {
                    mac = adapter.mac;
                }
            });
        }
    });
}
let macPart = mac && mac.split(':').join('');
const serialUuid = (length = 64) => {
    const now = Date.now();
    const result = `${macPart}${now.toString(16)}`;
    if (result.length >= length) {
        return result;
    }
    else {
        const sha1Data = sha1(`${Math.random()}`);
        return result.concat(sha1Data.slice(0, length - result.length));
    }
};
exports.serialUuid = serialUuid;
