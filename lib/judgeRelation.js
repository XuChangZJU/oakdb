"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeRelation = void 0;
var assert_1 = __importDefault(require("assert"));
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
function judgeRelation(entity, attr, schema) {
    var attributes = schema[entity].attributes;
    if (attributes.hasOwnProperty(attr)) {
        if (attributes[attr].type === 'ref') {
            return attributes[attr].ref;
        }
        return 1;
    }
    else if (attr.startsWith('$') ||
        attr === 'id' ||
        attr.endsWith('Id') && attributes.hasOwnProperty(attr.slice(0, attr.length - 2))) {
        return 1;
    }
    else if (attributes.hasOwnProperty('entity') && attributes.hasOwnProperty('entityId')) {
        // entity指针
        return 2; // entity指针的多对一
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
        var attr3 = attr.split('$')[0];
        assert_1.default(attr3.endsWith('s'), "entity \u300C" + entity + "\u300D has no property \u300C" + attr3 + "\u300D");
        var attr2 = attr3.slice(0, attr3.length - 1);
        var attributes2 = schema[attr2].attributes;
        if (attributes2.hasOwnProperty(entity)) {
            // 此时要求定义的时候一定要按entity名称来定义属性，如果有多个属性映射成外键是不能支持的  by Xc
            assert_1.default(attributes2[entity].type === 'ref');
            assert_1.default(attributes2[entity].ref === entity);
            return [attr2];
        }
        assert_1.default(attributes2.hasOwnProperty('entity') && attributes2.hasOwnProperty('entityId'));
        return { $$entity: attr2 };
    }
}
exports.judgeRelation = judgeRelation;
