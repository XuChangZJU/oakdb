export declare const ErrorCode: {
    volatileTriggerUncompleted: number;
    uniqueConstraintViolated: number;
    sortAttrUnexisted: number;
    dataFormatError: number;
    unsupportedYet: number;
    createError: (code: number, message: string, params?: object | undefined) => Error;
};
