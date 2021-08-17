import assert from 'assert';
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
export function judgeRelation(entity: string, attr: string, schema: Schema): any {
    const { attributes } = schema[entity];

    if (attributes.hasOwnProperty(attr)) {
        if (attributes[attr].type === 'ref') {
            return attributes[attr].ref as string;
        }
        return 1;
    }
    else if (
        attr.startsWith('$') ||
        attr === 'id'||
        attr.endsWith('Id') && attributes.hasOwnProperty(attr.slice(0, attr.length - 2))
    ) {
        return 1;
    }
    else if (attributes.hasOwnProperty('entity') && attributes.hasOwnProperty('entityId')) {
        // entity指针
        return 2;       // entity指针的多对一
    }
    else {
        /**
         * 传入的格式可能是：{
         *      qiniuFiles$1:{
         *      },
         *      qiniuFiles$2: {
         *      },
         * }
         */
        const attr3 = attr.split('$')[0];
        assert(attr3.endsWith('s'), `entity 「${entity}」 has no property 「${attr3}」`);
        const attr2 = attr3.slice(0, attr3.length - 1);
        const { attributes: attributes2 } = schema[attr2];
        if (attributes2.hasOwnProperty(entity)) {
            // 此时要求定义的时候一定要按entity名称来定义属性，如果有多个属性映射成外键是不能支持的  by Xc
            assert(attributes2[entity].type === 'ref');
            assert(attributes2[entity].ref === entity);

            return [attr2];
        }
        assert(attributes2.hasOwnProperty('entity') && attributes2.hasOwnProperty('entityId'), `entity 「${entity}」 has no property 「${attr3}」`);
        return { $$entity: attr2 };
    }
}