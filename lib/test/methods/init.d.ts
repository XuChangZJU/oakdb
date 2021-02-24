import { Schema } from '../../src/Schema';
import { Source } from '../../src/source/Source';
import { OakDb } from '../../src/index';
export declare function initOakDbInstance(schema: Schema, source: Source, init?: boolean, replace?: boolean, excludes?: string[], destroy?: boolean, destroyExcludes?: string[], truncate?: boolean): Promise<OakDb>;
export declare function disconnectOakDbInstance(oakDb: OakDb): Promise<void>;
