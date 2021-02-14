export const parallel = async (promises: Promise<any>[], formatErrorFn?:(error: Error) => Promise<any>) => {
    const result: any[] = promises.map(
        () => false
    );
    const promises2 = promises.map(
        async (ele, idx) => {
            try {
                result [idx] = await ele;
            }
            catch (err) {
                if (formatErrorFn) {
                    result [idx] = formatErrorFn(err);
                }
                else {
                    result [idx] = err;
                }
            }
        }
    );

    await Promise.all(promises2);
    if (formatErrorFn) {
        return result;
    }
    
    const firstFailure = result.find(
        ele => ele instanceof Error
    );
    if (firstFailure) {
        throw firstFailure;
    }
    return result;
};

const sha1 = require('sha1');
import { networkInterfaces,NetworkInterfaceInfo } from 'os';
let mac: string = '';
const adapters = networkInterfaces();
if (adapters) {
    Object.keys(adapters).forEach(
        (ele) => {
            const adpater = adapters[ele];
            if (adpater) {
                adpater.forEach(
                    adapter => {
                        if (adapter.mac !== '00:00:00:00:00:00') {
                            mac = adapter.mac;
                        }
                    }
                );
            }
        }
    );
}
let macPart = mac && mac.split(':').join('');

export const serialUuid = (length:number = 64) => {
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
