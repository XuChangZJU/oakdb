import { describe, it, before, after } from 'mocha';
import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/oakDb';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';

describe('test select', function() {
    this.timeout(1000000);
    let oakDb: OakDb;

    before(async () => {
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);

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
            const user = await oakDb.create({
                entity: 'user',
                data: {
                    name: 'wkj',
                    born: new Date('1989-05-10'),
                },
                txn,
            });
            const { id: userId } = user;
            
            await oakDb.create({
                entity: 'homework',
                data: {
                    title: 'english',
                    content: 'hello, I am lilei',
                    mark: 4.87,
                    userId,
                },
            });

            await oakDb.create({
                entity: 'homework',
                data: {
                    title: 'math',
                    content: '1 + 1 = 3',
                    mark: 2.58,
                    userId,
                },
            });

            const city = await oakDb.create({
                entity: 'city',
                data: {
                    name: '杭州市',
                    description: '非常美丽的城市',
                },
            });
            const shop = await oakDb.create({
                entity: 'shop',
                data: {
                    location: {
                        type: 'Point',
                        coordinates: [120, 30],
                    },
                    name: '楼外楼',
                    data: {
                        star: 5,
                        comment: 'so delicious!',
                    },
                    cityId: city.id,
                },
            });
            const { id: shopId } = shop;
            const userShop = await oakDb.create({
                entity: 'userShop',
                data: {
                    userId,
                    shopId,
                },
            });
            await oakDb.commitTransaction(txn);
        }
        catch (err) {
            await oakDb.rollbackTransaction(txn);
            throw err;
        }
    });

    it ('test select row', async () => {
        const users = await oakDb.find({
            entity: 'user',            
        });

        console.log(users);
    });

    it ('test select nested rows', async () => {
        const homeworks = await oakDb.find({
            entity: 'homework',
            query: {
                $or: [{
                    $text: {
                        $search: 'aaa',
                    },
                }, {
                    user: {
                        name: {
                            $like: 'wk%',
                        },
                    },
                }],
            },
        });

        console.log(homeworks);
    });

    it ('test select by id', async () => {
        const homework = await oakDb.findById({
            entity: 'homework',
            id: 1,
        });

        console.log(homework);
    });

    it ('test select geo', async () => {
        const shops = await oakDb.find({
            entity: 'shop',
        });

        console.log(JSON.stringify(shops));
    });

    it ('test select with $all', async () => {
        const userShops = await oakDb.find({
            entity: 'userShop',
            projection: {
                id: 1,
                shopId: 1,
                shop: {
                    $all: 1,
                    cityId: 1,
                    city: {
                        id: 1,
                        name: 1,
                    },
                },
            },
        });
        console.log(JSON.stringify(userShops));
    });

    after(async () => {
        if (oakDb) {
            await disconnectOakDbInstance(oakDb);
        }
    });
});