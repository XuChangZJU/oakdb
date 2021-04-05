import { describe, it, before, after } from 'mocha';
import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/oakDb';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';
import { assert } from 'console';
import { ErrorCode } from '../src/errorCode';
import { assign } from 'lodash';
import lodash from 'lodash';

describe('test insert', function() {
    this.timeout(100000);
    let oakDb: OakDb;

    before(async () => {
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);
    });

    it ('test insert row', async () => {
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.create({
                entity: 'user',
                data: {
                    name: 'xc',
                    born: new Date('1983-11-10'),
                },
                txn,
            });
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
    });

    it ('test insert many', async () => {
        const txn = await oakDb.startTransaction();
        try {
            await oakDb.createMany({
                entity: 'user',
                data: [{
                    name: 'xc2',
                    born: new Date('1983-11-10'),
                },{
                    name: 'gjj',
                    born: new Date('1998-12-11'),
                }],
                txn,
            }, true);
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
    });

    it ('test insert unique violation', async () => {
        await oakDb.create({
            entity: 'shop',
            data: {
                location: {
                    type: 'Point',
                    coordinates: [120, 30],
                },
                name: 'aaa',
                data: {
                    price: 'cheap',
                },
            },
        });

        try {
            await oakDb.create({
                entity: 'shop',
                data: {
                    location: {
                        type: 'Point',
                        coordinates: [121, 31],
                    },
                    name: 'aaa',
                    data: {
                        price: 'expensive',
                    },
                },
            });
        } catch(err) {
            console.error(err);
            assert(err.code === ErrorCode.uniqueConstraintViolated);
        }
    });

    it ('test function', async () => {
        async function asyncFunction(x: number, y: number): Promise<number> {
            console.log('aaaaa');
            return new Promise(
                (resolve) => {
                    setTimeout(() => resolve(x + y), 2000);
                }
            );
        }

        const code = {
            name: asyncFunction.name,
            fn: asyncFunction,
        };

        await oakDb.create({ entity: 'code', data: code });

        const [ code2 ] = await oakDb.find<{ id: number; name: string; fn: string }>({
            entity: 'code',            
        });
   

        const { fn } = code2;
        const FN = new Function(fn)();
        console.log(await FN(3, 5));


        const code3 = {
            name: 'assignFn',
            fn: (x: number, y: string) => {
                return assign({}, {
                    x,
                    y,
                });
            },
        };

        console.log(code3.fn.toString());

        await oakDb.create({ entity: 'code', data: code3 });

        const [ code4 ] = await oakDb.find<{ id: number; name: string; fn: string }>({
            entity: 'code',
            query: {
                name: 'assignFn',
            }         
        });

        // 由于ts的缘故，这里会把assign翻译成lodash_1.assign ....，还没有太好的解决方案
        console.log(code4);

        const { fn: fn2 } = code4;
        const FN2 = new Function('lodash_1', fn2)(lodash);
        console.log(FN2(3, 5));

    });

    after(async() => {
        await disconnectOakDbInstance(oakDb);
    });
});