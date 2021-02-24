"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatOperators = exports.SpatialOperators = exports.EvaluationOperators = exports.ElementOperators = exports.ComparisonOperators = exports.LogicOperators = exports.FnCallPrefix = void 0;
exports.FnCallPrefix = '$fnCall';
exports.LogicOperators = [
    '$and',
    '$nor',
    '$not',
    '$or',
    '$xor',
];
exports.ComparisonOperators = [
    '$eq',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$ne',
    '$like',
];
exports.ElementOperators = [
    '$exists',
];
exports.EvaluationOperators = [
    '$expr',
    '$text',
    '$in',
    '$nin',
    '$between',
];
exports.SpatialOperators = [
    '$geoIntersects',
    '$geoWithin',
    '$near',
    '$nearSphere',
    '$box',
    '$center',
    '$centerSphere',
    '$geometry',
    '$maxDistance',
    '$minDistance',
    '$polygon',
];
exports.FormatOperators = [
    '$format',
    '$arguments',
    '$as',
];
