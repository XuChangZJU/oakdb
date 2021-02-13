import { assign } from "lodash";

export const ErrorCode = {
    volatileTriggerUncompleted: 1001,
    uniqueConstraintViolated: 1002,

    createError: (code: number, message: string): Error => {
        const error = new Error(message);
        assign(error, { code });
        return error;
    }
};