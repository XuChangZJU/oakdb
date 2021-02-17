import { Schema } from '../src/Schema';
import { Source } from '../src/source/Source';
import { OakDb } from '../src/index';

import { schemaTestCreate } from './defs/schema';
import { mysql } from './defs/source';
import { initOakDbInstance, disconnectOakDbInstance } from './methods/init';
import { SqlTranslator } from '../src/translator/SqlTranslator';
import { MySQLTranslator } from '../src/translator/MySQLTranslator';
import { MySQL } from '../src/driver/MySQL';
import { Driver } from '../src/driver/Driver';

describe('test select', function() {
    this.timeout(100000);
    let oakDb: OakDb;
    let sqlTranslator: SqlTranslator;
    let mysqlDriver: Driver;
    before(async () => {
        // sqlTranslator = new MySQLTranslator(schemaTestCreate);

        //  some metadata columns should be added in uppon layer;
        oakDb = await initOakDbInstance(schemaTestCreate, mysql, true, true, undefined, true);
        sqlTranslator = (oakDb.driver as MySQL).translator;
        // sqlTranslator = new MySQLTranslator(schemaTestCreate);
    });

    it ('translate select by default projection', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'userShop',
        });
        console.log(sql);
    });

    it ('translate fnCall', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'userShop',
            projection: {
                id: 1,
                shopId: 'sss',
                user: {
                    $fnCall1: {
                        $format: 'count(%s + 1)',
                        $attrs: ['name'],
                        $as: 'nameCount',
                    },
                    born: 'bornUnixTimesatmp',
                },
            },
        });
        console.log(sql);
    });

    after(async () => {
        await disconnectOakDbInstance(oakDb);
    });
});