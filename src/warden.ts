import { Data, Row } from './types/Result';
import { Projection } from './types/Projection';
import { Txn } from './types/Txn';
import { Query } from './types/Query';
import { Schema } from './Schema';
import { ErrorCode } from './errorCode';
import assert from 'assert';
import { assign } from 'lodash';
import { v4 } from 'uuid';

type Action = 'insert'|'create' | 'update' | 'remove' | 'delete' | 'read' | 'select';
interface TriggerInput {
    row?: Row,
    data: Data,
    txn?: Txn,
    triggeredRow?: Row,
    triggeredRows?: Row[],
}

export interface Trigger {
    name: string;           // name应当保证unique
    entity: string;
    action: Action;
    before?: boolean;
    valueCheck?: ({row, data}: {row?: Row, data: Data}) => true | false | 'possible';
    attributes?: string | string[];
    fn: (TriggerInput: TriggerInput) => Promise<any>;
    triggerEntity?: string,
    triggerProjection?: Projection,
    triggerCondition?: ({row, data, txn}: {row?: Row, data: Data, txn: Txn}) => Promise<Query>;
    group?: boolean;
    volatile?: 'makeSure' | 'takeEasy';         // 如果是makesure，则会保证事务提交时，trigger至少执行一次（可能会多次），takeEasy则不能保证
}

export class Warden {
    static builtInColumnNames = ['$$volatileUuid$$', '$$volatileData$$'];

    private triggerActionStore: any;
    private triggerNameStore: any;
    
    static ActionAlias = {
        'insert': 'insert',
        'create': 'create',
        'update': 'update',
        'remove': 'remove',
        'delete': 'remove',
        'read': 'read',
        'select': 'select',
    };

    constructor(schema: Schema) {
        this.triggerActionStore = new Map();
        this.triggerNameStore = new Map();

        // 为对象增加volatile需要的metadata域
        Object.keys(schema).forEach(
            entity => {
                const { attributes } = schema[entity];
                assign(attributes, {
                    $$volatileUuid$$: {
                        type: 'varchar',
                        size: 64,
                        unique: true,
                        display: {
                            header: 'volatileUuid',
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

    registerTrigger(trigger: Trigger): void {
        const { 
            name,
            entity,
            action,
            before,
            volatile,
        } = trigger;
        assert(!before && !volatile);       // 一个trigger不可能同时满足这两个吧
        const action2 = Warden.ActionAlias[action];
        assert(action2);
        const key = `${entity}-${action2}`;
        
        const { triggerActionStore, triggerNameStore } = this;
        if (triggerActionStore.has(key)) {
            const triggers = triggerActionStore.get(key);
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
        data: Data,
        row?: Row,
    }): Trigger[]|void {
        const action2 = Warden.ActionAlias[action];
        assert(action2);
        const key = `${entity}-${action2}`;

        const { triggerActionStore: triggerStore } = this;
        const triggers:Trigger[] = triggerStore.get(key);
        if (triggers) {
            let volatileData: any[] = [];
            const validTriggers = triggers.filter(
                trigger => {
                    const { valueCheck, name, volatile } = trigger;
                    const checkResult = !trigger.valueCheck || trigger.valueCheck({ row, data });                    
                    if (checkResult === true && volatile === 'makeSure') {
                        volatileData.push({
                            name: name,
                            data,
                            row,                            
                        });
                    }
                    return checkResult;
                }
            );
            if (volatileData.length > 0) {
                if (row && row.$$volatileUuid$$) {
                    throw ErrorCode.createError(ErrorCode.volatileTriggerUncompleted, 'volatile trigger must be completed serially');
                }
                assign(data, {
                    $$volatileUuid$$: v4(),
                    $$volatileData$$: volatileData,
                });
            }

            if (validTriggers.length > 0) {
                return validTriggers;
            }
        }
    }

    protected async execTriggers({ triggers, row, data, txn }:{
        triggers: Trigger[],
        row?: Row,
        data: Data,
        txn: Txn,
    }):Promise<void> {
        
    }
}