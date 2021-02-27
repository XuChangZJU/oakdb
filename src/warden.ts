import { Data, Row } from './types/Result';
import { Projection } from './types/Projection';
import { Txn, TxnOption } from './types/Txn';
import { Query } from './types/Query';
import { Schema } from './Schema';
import { ErrorCode } from './errorCode';
import { parallel } from './utils';
import assert from 'assert';
import { assign, cloneDeep, intersection, remove, values } from 'lodash';

type Action = 'insert'|'create' | 'update' | 'remove' | 'delete' | 'read' | 'select';
interface TriggerInput {
    row?: Row,
    data?: Data,
    txn?: Txn,
    triggeredRow?: Row,
    triggeredRows?: Row[],
}

export interface Trigger {
    name: string;           // name应当保证unique
    entity: string;
    action: Action;
    before?: boolean;
    valueCheck?: ({row, data}: {row?: Row, data?: Data}) => boolean;
    attributes?: string | string[];
    fn: (triggerInput: TriggerInput, context?: object) => Promise<any>;
    triggerEntity?: string,
    triggerProjection?: Projection,
    triggerCondition?: ({row, data, txn}: {row?: Row, data?: Data, txn?: Txn}) => Promise<Query>;
    group?: boolean;
    volatile?: 'makeSure' | 'takeEasy';         // 如果是makesure，则会保证事务提交时，trigger至少执行一次（可能会多次），takeEasy则不能保证
}

export abstract class Warden {
    static builtInColumnNames = ['$$volatileTimestamp$$', '$$volatileData$$'];

    private triggerActionStore: Map<string, Trigger[]>;
    private triggerNameStore: Map<string, Trigger>;
    private log: (message: string) => void;
    
    static ActionAlias = {
        'insert': 'insert',
        'create': 'create',
        'update': 'update',
        'remove': 'remove',
        'delete': 'remove',
        'read': 'read',
        'select': 'select',
    };

    constructor(schema: Schema, log?: (message: string) => void) {
        this.triggerActionStore = new Map();
        this.triggerNameStore = new Map();
        this.log = log || console.log;

        // 为对象增加volatile需要的metadata域
        Object.keys(schema).forEach(
            entity => {
                const { attributes } = schema[entity];
                assign(attributes, {
                    $$volatileTimestamp$$: {
                        type: 'date',
                        unique: true,
                        display: {
                            header: 'volatileTimestamp',
                        },
                    },
                    $$volatileData$$: {
                        type: 'object',
                        display: {
                            header: 'volatileData',
                        },
                    },
                });
            }
        );
    }

    /**
     * register one trigger
     * @param trigger 
     */
    registerTrigger(trigger: Trigger): void {
        const { 
            name,
            entity,
            action,
            before,
            volatile,
        } = trigger;
        assert(!before || !volatile);       // 一个trigger不可能同时满足这两个吧
        const action2 = Warden.ActionAlias[action];
        assert(action2);
        const key = `${entity}-${action2}`;
        
        const { triggerActionStore, triggerNameStore } = this;
        if (triggerActionStore.has(key)) {
            const triggers = triggerActionStore.get(key) as Trigger[];
            triggers.push(trigger);
        }
        else {
            const triggers: Trigger[] = [];
            triggers.push(trigger);
            triggerActionStore.set(key, triggers);
        }

        assert(!triggerNameStore.has(name), `出现了重名的定义的trigger。【${name}】`);
        triggerNameStore.set(name, trigger);
    }

    protected getTriggers({ entity, action, data, row }: {
        entity: string,
        action: Action,
        data?: Data,
        row?: Row,
    }): Trigger[]|void {
        const action2 = Warden.ActionAlias[action];
        assert(action2);
        const key = `${entity}-${action2}`;

        const { triggerActionStore: triggerStore } = this;
        const triggers: Trigger[] | undefined = triggerStore.get(key);
        if (triggers) {
            let volatileData: any[] = [];
            const validTriggers = triggers.filter(
                trigger => {
                    const { valueCheck, name, volatile } = trigger;
                    const valueCheckResult = !trigger.valueCheck || trigger.valueCheck({ row, data });
                    const attrCheckResult = !trigger.attributes || !data
                        || (trigger.attributes instanceof Array && intersection(trigger.attributes, Object.keys(data)).length > 0)
                        || Object.keys(data).includes(trigger.attributes as string);
                    const checkResult = valueCheckResult && attrCheckResult;
                    if (checkResult === true && volatile === 'makeSure') {
                        volatileData.push({
                            name: name,
                            data: cloneDeep(data),
                        });
                    }
                    return checkResult;
                }
            );
            if (volatileData.length > 0) {
                if (row && row.$$volatileTimestamp$$) {
                    throw ErrorCode.createError(ErrorCode.volatileTriggerUncompleted, 'volatile trigger must be completed serially');
                }
                assign(data, {
                    $$volatileTimestamp$$: Date.now(),
                    $$volatileData$$: volatileData,
                });
            }

            if (validTriggers.length > 0) {
                return validTriggers;
            }
        }
    }

    abstract update({ entity, data, id, row, txn }: {
        entity: string;
        data: Data;
        id?: string | number;
        row?: Row;
        txn?: Txn;
    }, context?: object): Promise<Row>;

    abstract find({ entity, projection, query, indexFrom, count, forUpdate, txn}: {
        entity: string;
        projection?: Projection;
        query?: Query;
        indexFrom?: number;
        count?: number;
        txn?: Txn;
        forUpdate?: boolean;
    }, context?: object): Promise<Row[]>;

    abstract startTransaction(option?: TxnOption): Promise<Txn>;

    abstract commitTransaction(txn: Txn): Promise<void>;

    abstract rollbackTransaction(txn: Txn): Promise<void>;

    private getCount(result: number | object | Array<any>) {
        if (typeof result === 'number') {
            return result;
        }
        else if (result instanceof Array) {
            return result.length;
        }
        else {
            return 1;
        }
    }
    private async doTrigger({ trigger, txn, row, data, context }: {
        trigger: Trigger,
        txn?: Txn,
        row?: Row,
        data?: Data;
        context?: object;
    }): Promise<any> {
        const {
            triggerCondition,
            triggerEntity,
            triggerProjection,
            fn,
            group,
            name,
        } = trigger;
        
        const execFn = async (triggerInput: TriggerInput) => {
            const result = await fn(triggerInput, context);
            const count = this.getCount(result);
            this.log(`trigger ${name} executed successfully, affects ${count} rows`);
            return result;
        };
        if (triggerEntity) {
            const query = triggerCondition && await triggerCondition({ row, data, txn });
            const triggeredRows = await this.find({
                entity: triggerEntity,
                projection: triggerProjection,
                query,
            }, context);
            if (group) {
                const result = await execFn({
                    txn,
                    row,
                    data,
                    triggeredRows,
                });
                return result;
            }
            else {
                const result = await parallel(triggeredRows.map(
                    async triggeredRow => await execFn({
                        txn,
                        row,
                        data,
                        triggeredRow,
                    })
                ));
                return result;
            }
        }
        else {
            return await execFn({
                txn,
                row,
                data,
            });
        }
    }

    private async doTriggerAgain({ trigger, row, data, txn, context }: {
        trigger: Trigger,
        row: Row,
        data?: Data,
        txn: Txn,
        context?: object;
    }): Promise<any> {
        const {
            entity,
            volatile,
            name,
        } = trigger;
        const result = await this.doTrigger({
            txn,
            row,
            data,
            trigger,
            context,
        });

        if (volatile === 'makeSure') {
            const { $$volatileData$$: volatileData } = row;

            remove(volatileData, (vd: {
                name: string,
            }) => vd.name === name);
            const updateData = {
                $$volatileData$$: volatileData,
            };
            if (volatileData.length === 0) {
                assign(updateData, {
                    $$volatileTimestamp$$: null,
                    $$volatileData$$: null,
                });
            }
            await this.update({
                entity,
                data: updateData,
                row,
                txn,
            });
        }
        return result;
    }

    protected async execTriggers({ triggers, row, data, txn, context }:{
        triggers: Trigger[];
        row?: Row;
        data?: Data;
        txn?: Txn;
        context?: object;
    }):Promise<void> {
        if (triggers.length > 0) {
            const promises = triggers.map(
                (trigger) => async() => {
                    const { 
                        triggerCondition,
                        triggerEntity,
                        triggerProjection,
                        volatile,
                        fn,
                        group,
                        entity,
                    } = trigger;
    
                    if (volatile && txn) {
                        assert(row);
                        // 挂到事务提交时再做
                        txn && txn.on('committed', async () => {
                            const txn = await this.startTransaction();
                            try {
                                await this.doTriggerAgain({
                                    trigger,
                                    row,
                                    data,
                                    txn,
                                });
    
                                await this.commitTransaction(txn);
                            }
                            catch (err) {
                                await this.rollbackTransaction(txn);
                                this.log(err);
                                throw err;
                            }
                        });
                    }
                    else {
                        return await this.doTrigger({
                            txn,
                            trigger,
                            row,
                            data,
                        });
                    }
                }
            );
    
            await parallel(promises.map(p => p()));
        }
    }

    /**
     * find the volatile triggers are not done properly, then do them again.
     * @params interval: delay(millisecond) for the volatile triggers will be executed.
     */
    async patrol(interval: number = 60000, context?: object):Promise<void> {
        const entities = [...this.triggerNameStore.values()].filter(
            trigger => trigger.volatile === 'makeSure',
        ).map(
            trigger => trigger.entity
        );

        const now = Date.now();
        const promises = entities.map(
            entity => async () => {
                const txn = await this.startTransaction();
                try {
                    const rows = await this.find({
                        entity,
                        txn,
                        projection: {
                            id: 1,
                            $$volatileData$$: 1,
                        },
                        query: {
                            $$volatileTimestamp$$: {
                                $lt: now - interval,
                            },
                        },
                    }, context);
                    if (rows.length > 0) {
                        for (let row2 of rows) {
                            const { id, $$volatileData$$ } = row2;
                            for (let vdItem of $$volatileData$$ ) {
                                const { name, data } = vdItem;
                                const trigger = this.triggerNameStore.get(name) as Trigger;
                                await this.doTriggerAgain({ trigger, txn, row: row2, data });
                            }
                        }
                        this.log(`complete ${rows.length} volatile triggers on ${entity} in the patrol`)
                    }

                    await this.commitTransaction(txn);
                } catch (err) {
                    await this.rollbackTransaction(txn);
                    throw err;
                }
            }
        );
        await parallel(promises.map( p => p() ));
    }
}