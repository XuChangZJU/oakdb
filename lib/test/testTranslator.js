"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./defs/schema");
const source_1 = require("./defs/source");
const init_1 = require("./methods/init");
describe('test select', function () {
    this.timeout(100000);
    let oakDb;
    let sqlTranslator;
    let mysqlDriver;
    before(async () => {
        // sqlTranslator = new MySQLTranslator(schemaTestCreate);
        //  some metadata columns should be added in uppon layer;
        oakDb = await init_1.initOakDbInstance(schema_1.schemaTestCreate, source_1.mysql, true, true, undefined, true);
        sqlTranslator = oakDb.driver.translator;
        // sqlTranslator = new MySQLTranslator(schemaTestCreate);
    });
    it('translate select by default projection', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'userShop',
        });
        console.log(sql);
    });
    it('translate fnCall in projection', async () => {
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
    it('test where', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'homework',
            projection: {
                id: 1,
            },
            query: {
                title: {
                    $like: 'aaa%',
                },
                user: {
                    born: {
                        $lt: Date.now(),
                    }
                }
            }
        });
        console.log(sql);
    });
    it('fnCall in where', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'homework',
            projection: {
                id: 1,
            },
            query: {
                title: {
                    $like: 'aaa%',
                },
                user: {
                    $fnCall238: {
                        $format: 'HOUR(FROM_UNIXTIME(%s)) = 13',
                        $attrs: ['born'],
                    }
                }
            }
        });
        console.log(sql);
    });
    it('logic operator in where', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'homework',
            projection: {
                id: 1,
            },
            query: {
                $or: [{
                        title: {
                            $like: 'aaa%',
                        },
                        user: {
                            $fnCall238: {
                                $format: 'HOUR(FROM_UNIXTIME(%s)) = 13',
                                $attrs: ['born'],
                            }
                        },
                    }, {
                        $and: [{
                                $text: {
                                    $search: 'ttt',
                                },
                            }, {
                                user: {
                                    id: {
                                        $exists: true,
                                    },
                                },
                            }],
                    }],
            }
        });
        console.log(sql);
    });
    it('logic operator plus subquery in where', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'user',
            projection: {
                id: 1,
                $fnCall1: {
                    $format: 'HOUR(FROM_UNIXTIME(%s))',
                    $attrs: ['born'],
                    $as: 'bornDay',
                },
                born: 'bornUnixTimesatmp',
            },
            query: {
                $or: [{
                        $fnCall238: {
                            $format: 'HOUR(FROM_UNIXTIME(%s)) = 13',
                            $attrs: ['born'],
                        }
                    }, {
                        $and: [{
                                born: {
                                    $lt: new Date('1983-11-10'),
                                },
                            }, {
                                id: {
                                    $exists: true,
                                },
                            }],
                    }, {
                        id: {
                            $in: {
                                entity: 'homework',
                                projection: {
                                    userId: 1,
                                },
                                query: {
                                    $text: {
                                        $search: 'ttt',
                                    },
                                    content: {
                                        $between: ['aa', 'az'],
                                    },
                                },
                            },
                        },
                    }],
            }
        });
        console.log(sql);
    });
    it('sort', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'userShop',
            projection: {
                id: 1,
                shopId: 'sss',
                user: {
                    $fnCall1: {
                        $format: 'DAY(FROM_UNIXTIME(%s))',
                        $attrs: ['born'],
                        $as: 'bornDay',
                    },
                    born: 'bornUnixTimesatmp',
                    name: 1,
                },
            },
            sort: [{
                    $attr: {
                        id: 1,
                    },
                    $direction: 'asc',
                }, {
                    $attr: {
                        user: {
                            name: 1,
                        },
                    },
                    $direction: 'desc',
                }, {
                    $attr: {
                        sss: 1,
                    },
                    $direction: 'asc',
                }, {
                    $attr: {
                        user: {
                            bornDay: 1,
                        },
                    },
                    $direction: 'desc',
                }, {
                    $attr: {
                        user: {
                            $fnCall222: {
                                $format: 'DAY(FROM_UNIXTIME(%s))',
                                $attrs: ['born'],
                            },
                        },
                    },
                    $direction: 'asc',
                }],
        });
        console.log(sql);
    });
    it('indexFrom & forUpdate', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'homework',
            projection: {
                id: 1,
            },
            query: {
                $or: [{
                        title: {
                            $like: 'aaa%',
                        },
                        user: {
                            $fnCall238: {
                                $format: 'HOUR(FROM_UNIXTIME(%s)) = 13',
                                $attrs: ['born'],
                            }
                        },
                    }, {
                        $and: [{
                                $text: {
                                    $search: 'ttt',
                                },
                            }, {
                                user: {
                                    id: {
                                        $exists: true,
                                    },
                                },
                            }],
                    }],
            },
            indexFrom: 0,
            count: 100,
            forUpdate: true,
        });
        console.log(sql);
    });
    it('group by', async () => {
        const sql = sqlTranslator.translateSelect({
            entity: 'homework',
            projection: {
                $fnCall1: {
                    $format: 'count(%s)',
                    $attrs: ['id'],
                    $as: 'cnt',
                },
                $fnCall2: {
                    $format: 'avg(%s)',
                    $attrs: ['mark'],
                    $as: 'avg',
                },
                user: {
                    name: '$$username',
                },
            },
            query: {
                $text: {
                    $search: 'bbb',
                },
                user: {
                    name: {
                        $like: 'yang%',
                    },
                },
            },
            groupBy: {
                user: {
                    name: 1,
                },
            },
        });
        console.log(sql);
    });
    after(async () => {
        if (oakDb) {
            await init_1.disconnectOakDbInstance(oakDb);
        }
    });
});
