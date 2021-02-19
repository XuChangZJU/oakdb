import { assign } from "lodash";

export const ErrorCode = {
    volatileTriggerUncompleted: 1001,
    uniqueConstraintViolated: 1002,

    sortAttrUnexisted: 1500,

    createError: (code: number, message: string, params?: object): Error => {
        const error = new Error(message);
        assign(error, { code, params });
        return error;
    }
};