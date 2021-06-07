import { Schema } from "./Schema";
/**
 * @description judge relation of attr to entity
 * @param entity
 * @param attr
 * @returns {
    *      1: ownAttribute,
    *      string: many-to-one,
    *      2: many-to-one(using entity/entityId pointer)
    *      []: one-to-many(using entity as attribute name)
    *      {}: one-to-many(using entity/entityId)
    * }
    */
export declare function judgeRelation(entity: string, attr: string, schema: Schema): any;
