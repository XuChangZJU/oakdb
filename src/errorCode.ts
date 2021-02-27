import { assign } from "lodash";

export const ErrorCode = {
    databaseError: 1000,

    sortAttrUnexisted: 150001,
    dataFormatError: 150002,
    uniqueConstraintViolated: 150003,
    notNullConstraintViolated: 150004,
    volatileTriggerUncompleted: 150005,
    deadlockDetected: 150006,
    lockWaitTimeout: 150007,

    unsupportedYet: 200000,

    createError: (code: number, message: string, params?: object): Error => {
        const error = new Error(message);
        assign(error, { code, params });
        return error;
    }
};