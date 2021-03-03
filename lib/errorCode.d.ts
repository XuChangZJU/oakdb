export declare const ErrorCode: {
    databaseError: number;
    sortAttrUnexisted: number;
    dataFormatError: number;
    uniqueConstraintViolated: number;
    notNullConstraintViolated: number;
    volatileTriggerUncompleted: number;
    deadlockDetected: number;
    lockWaitTimeout: number;
    unsupportedYet: number;
    createError: (code: number, message: string, params?: object | undefined) => Error;
};
