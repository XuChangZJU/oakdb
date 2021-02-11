import { Schema } from '../../src/Schema';

export const schemaTestCreate: Schema = {
    user: {
        title: '用户',
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
        title: '帐户',
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
            },
        }],
    },
    shop: {
        title: '商店',
        attributes: {
            coordinate: {
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
        },
        indexes: [{
            name: 'idxCoordinate',
            columns: [{
                name: 'coordinate',
            }],
            config: {
                type: 'spatial',
            },
        }],
    },
};
