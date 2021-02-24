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
                display: {
                    header: '姓名',
                },
            },
            born: {
                type: 'date',
                display: {
                    header: '出生日期',
                },
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
                display: {
                    header: '标题',
                },
            },
            content: {
                type: 'text',
                display: {
                    header: '内容',
                },
            },
            mark: {
                type: 'float',
                display: {
                    header: '打分',
                },
            },
            user: {
                type: 'ref',
                ref: 'user',
                display: {
                    header: '作者',
                },
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
                display: {
                    header: '坐标',
                },
            },
            name: {
                type: 'varchar',
                params: {
                    length: 32,
                },
                unique: true,
                display: {
                    header: '名称',
                }
            },
            data: {
                type: 'object',
                display: {
                    header: '数据',
                }
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
                display: {
                    header: '用户',
                },
            },
            shop: {
                type: 'ref',
                ref: 'shop',
                display: {
                    header: '商店',
                },
            },
        },
    },
    code: {
        title: '函数',
        attributes: {
            fn: {
                type: 'function',
                display: {
                    header: '函数体',
                },
            },
            name: {
                type: 'text',
                display: {
                    header: '函数名',
                },
            },
        },
    },
};
