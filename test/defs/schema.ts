import { Schema } from '../../src/Schema';

export const schemaTestCreate: Schema = {
    user: {
        title: '用户',
        storageName: 'userrr',
        attributes: {
            name: {
                type: 'varchar',
                params: {
                    length: 32,
                },
            },
            born: {
                type: 'date',
            },
        },
        indexes: [{
            name: 'idxNameBorn',
            columns: [{
                name: 'name',
            },{
                name: 'born',
                direction: 'DESC',
            }],
        }],
        config: {
            hasUuid: true,
        },
    },
    homework: {
        title: '作业',
        attributes: {
            title: {
                type: 'varchar',
                params: {
                    length: 32,
                },
            },
            content: {
                type: 'text',
            },
            mark: {
                type: 'float',
            },
            user: {
                type: 'ref',
                ref: 'user',
            },
        },
        indexes: [{
            name: 'idxFt',
            columns: [{
                name: 'title',
            },{
                name: 'content',
            }],
            config: {
                type: 'fulltext',
                parser: 'ngram',
            },
        }],
    },
    shop: {
        title: '商店',
        attributes: {
            location: {
                type: 'geometry',
                notNull: true,
            },
            name: {
                type: 'varchar',
                params: {
                    length: 32,
                },
                unique: true,
            },
            data: {
                type: 'object',
            }
        },
        indexes: [{
            name: 'idxLocation',
            columns: [{
                name: 'location',
            }],
            config: {
                type: 'spatial',
            },
        }],
    },
    userShop: {
        title: '用户商店连接',
        attributes: {
            user: {
                type: 'ref',
                ref: 'user',
            },
            shop: {
                type: 'ref',
                ref: 'shop',
            },
        },
    },
    code: {
        title: '函数',
        attributes: {
            fn: {
                type: 'function',
            },
            name: {
                type: 'text',
            },
        },
    },
};
