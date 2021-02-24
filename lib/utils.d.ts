export declare const parallel: (promises: Promise<any>[], formatErrorFn?: ((error: Error) => Promise<any>) | undefined) => Promise<any[]>;
export declare const serialUuid: (length?: number) => string;
