import { assign } from "lodash";

export const ErrorCode = {
    databaseUnknownError: 1000,
    volatileTriggerUncompleted: 1001,

    sortAttrUnexisted: 150001,
    dataFormatError: 150002,
    uniqueConstraintViolated: 150003,

    unsupportedYet: 200000,

    createError: (code: number, message: string, params?: object): Error => {
        const error = new Error(message);
        assign(error, { code, params });
        return error;
    }
};