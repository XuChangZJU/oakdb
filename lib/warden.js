"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Warden = void 0;
const errorCode_1 = require("./errorCode");
const utils_1 = require("./utils");
const assert_1 = __importDefault(require("assert"));
const lodash_1 = require("lodash");
class Warden {
    constructor(schema, log) {
        this.triggerActionStore = new Map();
        this.triggerNameStore = new Map();
        this.log = log || console.log;
        // 为对象增加volatile需要的metadata域
        Object.keys(schema).forEach(entity => {
            const { attributes } = schema[entity];
            lodash_1.assign(attributes, {
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
        });
    }
    /**
     * register one trigger
     * @param trigger
     */
    registerTrigger(trigger) {
        const { name, entity, action, before, volatile, } = trigger;
        assert_1.default(!before || !volatile); // 一个trigger不可能同时满足这两个吧
        const action2 = Warden.ActionAlias[action];
        assert_1.default(action2);
        const key = `${entity}-${action2}`;
        const { triggerActionStore, triggerNameStore } = this;
        if (triggerActionStore.has(key)) {
            const triggers = triggerActionStore.get(key);
            triggers.push(trigger);
        }
        else {
            const triggers = [];
            triggers.push(trigger);
            triggerActionStore.set(key, triggers);
        }
        assert_1.default(!triggerNameStore.has(name), `出现了重名的定义的trigger。【${name}】`);
        triggerNameStore.set(name, trigger);
    }
    getTriggers({ entity, action, data, row }) {
        const action2 = Warden.ActionAlias[action];
        assert_1.default(action2);
        const key = `${entity}-${action2}`;
        const { triggerActionStore: triggerStore } = this;
        const triggers = triggerStore.get(key);
        if (triggers) {
            let volatileData = [];
            const validTriggers = triggers.filter(trigger => {
                const { valueCheck, name, volatile } = trigger;
                const valueCheckResult = !trigger.valueCheck || trigger.valueCheck({ row, data });
                const attrCheckResult = !trigger.attributes || !data
                    || (trigger.attributes instanceof Array && lodash_1.intersection(trigger.attributes, Object.keys(data)).length > 0)
                    || Object.keys(data).includes(trigger.attributes);
                const checkResult = valueCheckResult && attrCheckResult;
                if (checkResult === true && volatile === 'makeSure') {
                    volatileData.push({
                        name: name,
                        data: lodash_1.cloneDeep(data),
                    });
                }
                return checkResult;
            });
            if (volatileData.length > 0) {
                if (row && row.$$volatileTimestamp$$) {
                    throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.volatileTriggerUncompleted, 'volatile trigger must be completed serially');
                }
                lodash_1.assign(data, {
                    $$volatileTimestamp$$: Date.now(),
                    $$volatileData$$: volatileData,
                });
            }
            if (validTriggers.length > 0) {
                return validTriggers;
            }
        }
    }
    getCount(result) {
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
    async doTrigger({ trigger, txn, row, data, context }) {
        const { triggerCondition, triggerEntity, triggerProjection, fn, group, name, } = trigger;
        const execFn = async (triggerInput) => {
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
                const result = await utils_1.parallel(triggeredRows.map(async (triggeredRow) => await execFn({
                    txn,
                    row,
                    data,
                    triggeredRow,
                })));
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
    async doTriggerAgain({ trigger, row, data, txn, context }) {
        const { entity, volatile, name, } = trigger;
        const result = await this.doTrigger({
            txn,
            row,
            data,
            trigger,
            context,
        });
        if (volatile === 'makeSure') {
            const { $$volatileData$$: volatileData } = row;
            lodash_1.remove(volatileData, (vd) => vd.name === name);
            const updateData = {
                $$volatileData$$: volatileData,
            };
            if (volatileData.length === 0) {
                lodash_1.assign(updateData, {
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
    async execTriggers({ triggers, row, data, txn, context }) {
        if (triggers.length > 0) {
            const promises = triggers.map((trigger) => async () => {
                const { triggerCondition, triggerEntity, triggerProjection, volatile, fn, group, entity, } = trigger;
                if (volatile && txn) {
                    assert_1.default(row);
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
            });
            await utils_1.parallel(promises.map(p => p()));
        }
    }
    /**
     * find the volatile triggers are not done properly, then do them again.
     * @params interval: delay(millisecond) for the volatile triggers will be executed.
     */
    async patrol(interval = 60000, context) {
        const entities = [...this.triggerNameStore.values()].filter(trigger => trigger.volatile === 'makeSure').map(trigger => trigger.entity);
        const now = Date.now();
        const promises = entities.map(entity => async () => {
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
                        for (let vdItem of $$volatileData$$) {
                            const { name, data } = vdItem;
                            const trigger = this.triggerNameStore.get(name);
                            await this.doTriggerAgain({ trigger, txn, row: row2, data });
                        }
                    }
                    this.log(`complete ${rows.length} volatile triggers on ${entity} in the patrol`);
                }
                await this.commitTransaction(txn);
            }
            catch (err) {
                await this.rollbackTransaction(txn);
                throw err;
            }
        });
        await utils_1.parallel(promises.map(p => p()));
    }
}
exports.Warden = Warden;
Warden.builtInColumnNames = ['$$volatileTimestamp$$', '$$volatileData$$'];
Warden.ActionAlias = {
    'insert': 'insert',
    'create': 'insert',
    'update': 'update',
    'remove': 'remove',
    'delete': 'remove',
    'read': 'read',
    'select': 'read',
};
