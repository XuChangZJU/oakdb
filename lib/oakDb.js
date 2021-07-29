"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OakDb = void 0;
var lodash_1 = require("lodash");
var MySQL_1 = require("./driver/MySQL");
var warden_1 = require("./warden");
var utils_1 = require("./utils");
var errorCode_1 = require("./errorCode");
var Operator_1 = require("./types/Operator");
var assert_1 = __importDefault(require("assert"));
var judgeRelation_1 = require("./judgeRelation");
var OakDb = /** @class */ (function (_super) {
    __extends(OakDb, _super);
    function OakDb(schema, source, log) {
        var _this = this;
        var schema2 = lodash_1.cloneDeep(schema);
        _this = _super.call(this, schema2, log) || this;
        _this.schema = schema2;
        _this.source = source;
        var name = source.name, options = source.options;
        switch (name.toLowerCase()) {
            case 'mysql': {
                _this.driver = new MySQL_1.MySQL(options, schema2, log);
                break;
            }
            default: {
                throw new Error('暂时不支持的数据源');
            }
        }
        _this.addBuiltInColumns();
        _this.createDefaultTriggers();
        return _this;
    }
    OakDb.prototype.count = function (_a) {
        var entity = _a.entity, query = _a.query, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var projection, _b, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        projection = {
                            $fncall1: {
                                $format: 'count(%s)',
                                $attrs: ['id'],
                                $as: 'cnt',
                            }
                        };
                        return [4 /*yield*/, this.stat({ entity: entity, projection: projection, query: query, txn: txn })];
                    case 1:
                        _b = __read.apply(void 0, [_c.sent(), 1]), result = _b[0];
                        return [2 /*return*/, result.cnt];
                }
            });
        });
    };
    OakDb.prototype.addBuiltInColumns = function () {
        var _this = this;
        var schema = this.schema;
        Object.keys(schema).forEach(function (entity) {
            var _a = schema[entity], attributes = _a.attributes, config = _a.config, indexes = _a.indexes, view = _a.view, as = _a.as;
            if (view && as) {
                //  if view, create attributes by definition
                var entity2 = as.entity, projection = as.projection;
                var analyzeProjection_1 = function (e, p, prefix) {
                    var a = schema[e].attributes;
                    Object.keys(p).forEach(function (attr) {
                        var _a, _b;
                        if (attr.toLowerCase().startsWith('$fncall')) {
                            var $as = p[attr].$as;
                            assert_1.default($as);
                            var attrName = prefix ? prefix + "." + $as : $as;
                            lodash_1.assign(attributes, (_a = {},
                                _a[attrName] = {
                                    type: 'double',
                                },
                                _a));
                        }
                        else {
                            var _c = a[attr], type = _c.type, ref = _c.ref;
                            if (type === 'ref') {
                                var prefix2 = prefix ? prefix + "." + attr : attr;
                                analyzeProjection_1(ref, p[attr], prefix2);
                            }
                            else {
                                var attrName = prefix ? prefix + "." + attr : attr;
                                lodash_1.assign(attributes, (_b = {},
                                    _b[attrName] = a[attr],
                                    _b));
                            }
                        }
                    });
                };
                analyzeProjection_1(entity2, projection);
            }
            else {
                var foreignKeyColumns_1 = {};
                var foreignKeyIndexes_1 = [];
                Object.keys(attributes).forEach(function (attr) {
                    var _a;
                    var type = attributes[attr].type;
                    if (type === 'ref') {
                        Object.assign(foreignKeyColumns_1, (_a = {},
                            _a[attr + "Id"] = {
                                type: _this.driver.getPrimaryKeyType(),
                                display: {
                                    header: attr + "Id",
                                },
                            },
                            _a));
                        foreignKeyIndexes_1.push({
                            name: "index_" + attr + "Id",
                            columns: [{
                                    name: attr + "Id",
                                }],
                        });
                    }
                });
                Object.assign(attributes, foreignKeyColumns_1, {
                    '$$createAt$$': {
                        type: 'date',
                        notNull: true,
                        display: {
                            header: '创建时间',
                        },
                    },
                    '$$updateAt$$': {
                        type: 'date',
                        notNull: true,
                        display: {
                            header: '更新时间',
                        },
                    },
                    'id': {
                        type: _this.driver.getPrimaryKeyType(),
                        notNull: true,
                        display: {
                            header: '主键',
                            weight: 200,
                        },
                    },
                });
                var indexCreateAt = {
                    name: "index_createAt",
                    columns: [{
                            name: '$$createAt$$',
                        }],
                };
                var indexUpdateAt = {
                    name: "index_updateAt",
                    columns: [{
                            name: '$$updateAt$$',
                        }],
                };
                if (indexes) {
                    indexes.push(indexCreateAt);
                    indexes.push(indexUpdateAt);
                    Object.assign(schema[entity], {
                        indexes: indexes.concat(foreignKeyIndexes_1),
                    });
                }
                else {
                    lodash_1.assign(schema[entity], {
                        indexes: foreignKeyIndexes_1.concat([indexCreateAt, indexUpdateAt]),
                    });
                }
                if (!config || !config.removePhysically) {
                    lodash_1.assign(attributes, {
                        '$$deleteAt$$': {
                            type: 'date',
                            display: {
                                header: '删除时间',
                            },
                        },
                    });
                }
                if (config && config.hasUuid) {
                    lodash_1.assign(attributes, {
                        '$$uuid$$': {
                            type: 'varchar',
                            params: {
                                length: 64,
                            },
                            unique: true,
                            notNull: true,
                            display: {
                                header: 'uuid',
                            },
                        },
                    });
                }
            }
        });
    };
    OakDb.prototype.createDefaultTriggers = function () {
        var _this = this;
        var schema = this.schema;
        Object.keys(schema).forEach(function (entity) {
            var createUuid = false;
            var checkNotNull = [];
            var _a = schema[entity], attributes = _a.attributes, config = _a.config, uniqueConstraints = _a.uniqueConstraints;
            if (attributes.hasOwnProperty('$$uuid$$')) {
                createUuid = true;
            }
            var _loop_1 = function (attr) {
                if (attributes[attr].notNull) {
                    if (attributes[attr].type === 'ref') {
                        checkNotNull.push(attr + "Id");
                    }
                    else {
                        checkNotNull.push(attr);
                    }
                }
                if (attributes[attr].onRefDelete) {
                    switch (attributes[attr].onRefDelete) {
                        case 'delete': {
                            _this.registerTrigger({
                                name: "cascading delete " + entity + " on " + attr,
                                entity: attributes[attr].ref,
                                action: 'delete',
                                fn: function (_a, context) {
                                    var row = _a.row, txn = _a.txn;
                                    return __awaiter(_this, void 0, void 0, function () {
                                        var id, cascadingRows, cascadingRows_1, cascadingRows_1_1, cascadingRow, e_1_1;
                                        var _b, e_1, _c;
                                        return __generator(this, function (_d) {
                                            switch (_d.label) {
                                                case 0:
                                                    id = row.id;
                                                    return [4 /*yield*/, this.find({
                                                            entity: entity,
                                                            query: (_b = {},
                                                                _b[attr + "Id"] = id,
                                                                _b),
                                                            txn: txn,
                                                            forUpdate: true,
                                                        }, context)];
                                                case 1:
                                                    cascadingRows = _d.sent();
                                                    _d.label = 2;
                                                case 2:
                                                    _d.trys.push([2, 7, 8, 9]);
                                                    cascadingRows_1 = __values(cascadingRows), cascadingRows_1_1 = cascadingRows_1.next();
                                                    _d.label = 3;
                                                case 3:
                                                    if (!!cascadingRows_1_1.done) return [3 /*break*/, 6];
                                                    cascadingRow = cascadingRows_1_1.value;
                                                    return [4 /*yield*/, this.remove({
                                                            entity: entity,
                                                            id: cascadingRow.id,
                                                            row: cascadingRow,
                                                            txn: txn,
                                                        }, context)];
                                                case 4:
                                                    _d.sent();
                                                    _d.label = 5;
                                                case 5:
                                                    cascadingRows_1_1 = cascadingRows_1.next();
                                                    return [3 /*break*/, 3];
                                                case 6: return [3 /*break*/, 9];
                                                case 7:
                                                    e_1_1 = _d.sent();
                                                    e_1 = { error: e_1_1 };
                                                    return [3 /*break*/, 9];
                                                case 8:
                                                    try {
                                                        if (cascadingRows_1_1 && !cascadingRows_1_1.done && (_c = cascadingRows_1.return)) _c.call(cascadingRows_1);
                                                    }
                                                    finally { if (e_1) throw e_1.error; }
                                                    return [7 /*endfinally*/];
                                                case 9: return [2 /*return*/, cascadingRows.length];
                                            }
                                        });
                                    });
                                }
                            });
                            break;
                        }
                        case 'setNull': {
                            _this.registerTrigger({
                                name: "cascading delete " + entity + " on " + attr,
                                entity: attributes[attr].ref,
                                action: 'delete',
                                fn: function (_a, context) {
                                    var row = _a.row, txn = _a.txn;
                                    return __awaiter(_this, void 0, void 0, function () {
                                        var id, cascadingRows, cascadingRows_2, cascadingRows_2_1, cascadingRow, e_2_1;
                                        var _b, e_2, _c, _d;
                                        return __generator(this, function (_e) {
                                            switch (_e.label) {
                                                case 0:
                                                    id = row.id;
                                                    return [4 /*yield*/, this.find({
                                                            entity: entity,
                                                            query: (_b = {},
                                                                _b[attr + "Id"] = id,
                                                                _b),
                                                            txn: txn,
                                                            forUpdate: true,
                                                        }, context)];
                                                case 1:
                                                    cascadingRows = _e.sent();
                                                    _e.label = 2;
                                                case 2:
                                                    _e.trys.push([2, 7, 8, 9]);
                                                    cascadingRows_2 = __values(cascadingRows), cascadingRows_2_1 = cascadingRows_2.next();
                                                    _e.label = 3;
                                                case 3:
                                                    if (!!cascadingRows_2_1.done) return [3 /*break*/, 6];
                                                    cascadingRow = cascadingRows_2_1.value;
                                                    return [4 /*yield*/, this.update({
                                                            entity: entity,
                                                            id: cascadingRow.id,
                                                            row: cascadingRow,
                                                            data: (_d = {},
                                                                _d[attr + "Id"] = null,
                                                                _d),
                                                            txn: txn,
                                                        }, context)];
                                                case 4:
                                                    _e.sent();
                                                    _e.label = 5;
                                                case 5:
                                                    cascadingRows_2_1 = cascadingRows_2.next();
                                                    return [3 /*break*/, 3];
                                                case 6: return [3 /*break*/, 9];
                                                case 7:
                                                    e_2_1 = _e.sent();
                                                    e_2 = { error: e_2_1 };
                                                    return [3 /*break*/, 9];
                                                case 8:
                                                    try {
                                                        if (cascadingRows_2_1 && !cascadingRows_2_1.done && (_c = cascadingRows_2.return)) _c.call(cascadingRows_2);
                                                    }
                                                    finally { if (e_2) throw e_2.error; }
                                                    return [7 /*endfinally*/];
                                                case 9: return [2 /*return*/, cascadingRows.length];
                                            }
                                        });
                                    });
                                }
                            });
                            break;
                        }
                        default: {
                            assert_1.default(false);
                        }
                    }
                }
            };
            for (var attr in attributes) {
                _loop_1(attr);
            }
            if (createUuid || uniqueConstraints && uniqueConstraints.length > 0) {
                // create before trigger for insert action
                var name_1 = "check insert value for " + entity;
                var trigger = {
                    name: name_1,
                    entity: entity,
                    action: 'insert',
                    before: true,
                    fn: function (_a) {
                        var data = _a.data, txn = _a.txn;
                        return __awaiter(_this, void 0, void 0, function () {
                            var result, uniqueConstraints_1, uniqueConstraints_1_1, uc, uc2, query, list, id, e_3_1, nullAttr;
                            var e_3, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        result = 0;
                                        if (createUuid && data && !data.$$uuid$$) {
                                            lodash_1.assign(data, {
                                                $$uuid$$: utils_1.serialUuid(64),
                                            });
                                            result = result + 1;
                                        }
                                        if (!(uniqueConstraints && uniqueConstraints.length > 0)) return [3 /*break*/, 8];
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 6, 7, 8]);
                                        uniqueConstraints_1 = __values(uniqueConstraints), uniqueConstraints_1_1 = uniqueConstraints_1.next();
                                        _c.label = 2;
                                    case 2:
                                        if (!!uniqueConstraints_1_1.done) return [3 /*break*/, 5];
                                        uc = uniqueConstraints_1_1.value;
                                        uc2 = uc.map(function (c) {
                                            if (attributes[c].type === 'ref') {
                                                return c + "Id";
                                            }
                                            return c;
                                        });
                                        query = lodash_1.pick(data, uc2);
                                        return [4 /*yield*/, this.find({
                                                entity: entity,
                                                query: query,
                                                txn: txn,
                                                projection: {
                                                    id: 1,
                                                }
                                            })];
                                    case 3:
                                        list = _c.sent();
                                        if (list.length > 0) {
                                            id = list[0].id;
                                            throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.uniqueConstraintViolated, "unique constraint violated on " + uc.join(',') + " of entity " + entity + " on insert", {
                                                id: id
                                            });
                                        }
                                        _c.label = 4;
                                    case 4:
                                        uniqueConstraints_1_1 = uniqueConstraints_1.next();
                                        return [3 /*break*/, 2];
                                    case 5: return [3 /*break*/, 8];
                                    case 6:
                                        e_3_1 = _c.sent();
                                        e_3 = { error: e_3_1 };
                                        return [3 /*break*/, 8];
                                    case 7:
                                        try {
                                            if (uniqueConstraints_1_1 && !uniqueConstraints_1_1.done && (_b = uniqueConstraints_1.return)) _b.call(uniqueConstraints_1);
                                        }
                                        finally { if (e_3) throw e_3.error; }
                                        return [7 /*endfinally*/];
                                    case 8:
                                        if (checkNotNull.length > 0) {
                                            nullAttr = checkNotNull.find(function (attr) { return data && data[attr] === null; });
                                            if (nullAttr) {
                                                throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.notNullConstraintViolated, "not null constraint violated on " + nullAttr + " of entity " + entity + " on insert");
                                            }
                                        }
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                };
                _this.registerTrigger(trigger);
            }
            if (uniqueConstraints && uniqueConstraints.length > 0) {
                var name_2 = " check value when update  " + entity + " ";
                var trigger = {
                    name: name_2,
                    entity: entity,
                    action: 'update',
                    attributes: lodash_1.union.apply(null, uniqueConstraints),
                    before: true,
                    fn: function (_a) {
                        var data = _a.data, row = _a.row, txn = _a.txn;
                        return __awaiter(_this, void 0, void 0, function () {
                            var result, uniqueConstraints_2, uniqueConstraints_2_1, uc, uc2, query, list, id, e_4_1, nullAttr;
                            var e_4, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        assert_1.default(data && row);
                                        result = 0;
                                        if (!(uniqueConstraints && uniqueConstraints.length > 0)) return [3 /*break*/, 8];
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 6, 7, 8]);
                                        uniqueConstraints_2 = __values(uniqueConstraints), uniqueConstraints_2_1 = uniqueConstraints_2.next();
                                        _c.label = 2;
                                    case 2:
                                        if (!!uniqueConstraints_2_1.done) return [3 /*break*/, 5];
                                        uc = uniqueConstraints_2_1.value;
                                        uc2 = uc.map(function (c) {
                                            if (attributes[c].type === 'ref') {
                                                return c + "Id";
                                            }
                                            return c;
                                        });
                                        query = lodash_1.assign(lodash_1.pick(row, uc2), lodash_1.pick(data, uc2));
                                        lodash_1.assign(query, {
                                            id: {
                                                $ne: row.id,
                                            },
                                        });
                                        return [4 /*yield*/, this.find({
                                                entity: entity,
                                                query: query,
                                                txn: txn,
                                                projection: {
                                                    id: 1,
                                                }
                                            })];
                                    case 3:
                                        list = _c.sent();
                                        if (list.length > 0) {
                                            id = list[0].id;
                                            throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.uniqueConstraintViolated, "unique constraint violated on " + uc.join(',') + " of entity " + entity + " on insert", {
                                                id: id
                                            });
                                        }
                                        result = result + 1;
                                        _c.label = 4;
                                    case 4:
                                        uniqueConstraints_2_1 = uniqueConstraints_2.next();
                                        return [3 /*break*/, 2];
                                    case 5: return [3 /*break*/, 8];
                                    case 6:
                                        e_4_1 = _c.sent();
                                        e_4 = { error: e_4_1 };
                                        return [3 /*break*/, 8];
                                    case 7:
                                        try {
                                            if (uniqueConstraints_2_1 && !uniqueConstraints_2_1.done && (_b = uniqueConstraints_2.return)) _b.call(uniqueConstraints_2);
                                        }
                                        finally { if (e_4) throw e_4.error; }
                                        return [7 /*endfinally*/];
                                    case 8:
                                        if (checkNotNull.length > 0) {
                                            nullAttr = checkNotNull.find(function (attr) { return data && data[attr] === null; });
                                            if (nullAttr) {
                                                throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.notNullConstraintViolated, "not null constraint violated on " + nullAttr + " of entity " + entity + " on update");
                                            }
                                        }
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                };
                _this.registerTrigger(trigger);
            }
        });
    };
    OakDb.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.connect()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OakDb.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.disconnect()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 初始化对象结构
     */
    OakDb.prototype.init = function (replace, excludes) {
        if (replace === void 0) { replace = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.init(replace, excludes)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 销毁对象结构
     * @param truncate
     * @param excludes
     */
    OakDb.prototype.destroy = function (truncate, excludes) {
        if (truncate === void 0) { truncate = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.destroy(truncate, excludes)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OakDb.prototype.startTransaction = function (option) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.startTransaction(option)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OakDb.prototype.commitTransaction = function (txn) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.commitTransaction(txn)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OakDb.prototype.rollbackTransaction = function (txn) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.rollbackTransaction(txn)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OakDb.prototype.preInsert = function (entity, data, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var now, beforeTriggers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = Date.now();
                        lodash_1.assign(data, {
                            $$createAt$$: now,
                            $$updateAt$$: now,
                        });
                        beforeTriggers = this.getTriggers({ entity: entity, action: 'insert', data: data, before: true });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                data: data,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    OakDb.prototype.postInsert = function (entity, data, row, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var afterTriggers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        afterTriggers = this.getTriggers({ entity: entity, action: 'insert', data: data, before: false });
                        if (!(afterTriggers && afterTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: afterTriggers,
                                data: data,
                                row: row,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 插入数据
     * @param entity 对象
     * @param data 数据
     */
    OakDb.prototype.create = function (_a, context) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.preInsert(entity, data, txn, context)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.driver.create({ entity: entity, data: data, txn: txn })];
                    case 2:
                        row = _b.sent();
                        return [4 /*yield*/, this.postInsert(entity, data, row, txn, context)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, row];
                }
            });
        });
    };
    OakDb.prototype.createMany = function (_a, batch, context) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var data_1, data_1_1, d, e_5_1, rows, idx, rows_1, rows_1_1, r, e_6_1;
            var e_5, _b, e_6, _c;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!batch) return [3 /*break*/, 18];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, 7, 8]);
                        data_1 = __values(data), data_1_1 = data_1.next();
                        _d.label = 2;
                    case 2:
                        if (!!data_1_1.done) return [3 /*break*/, 5];
                        d = data_1_1.value;
                        return [4 /*yield*/, this.preInsert(entity, d, txn, context)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4:
                        data_1_1 = data_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_5_1 = _d.sent();
                        e_5 = { error: e_5_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (data_1_1 && !data_1_1.done && (_b = data_1.return)) _b.call(data_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                        return [7 /*endfinally*/];
                    case 8: return [4 /*yield*/, this.driver.createMany({ entity: entity, data: data, txn: txn })];
                    case 9:
                        rows = _d.sent();
                        idx = 0;
                        _d.label = 10;
                    case 10:
                        _d.trys.push([10, 15, 16, 17]);
                        rows_1 = __values(rows), rows_1_1 = rows_1.next();
                        _d.label = 11;
                    case 11:
                        if (!!rows_1_1.done) return [3 /*break*/, 14];
                        r = rows_1_1.value;
                        return [4 /*yield*/, this.postInsert(entity, data[idx++], r, txn, context)];
                    case 12:
                        _d.sent();
                        _d.label = 13;
                    case 13:
                        rows_1_1 = rows_1.next();
                        return [3 /*break*/, 11];
                    case 14: return [3 /*break*/, 17];
                    case 15:
                        e_6_1 = _d.sent();
                        e_6 = { error: e_6_1 };
                        return [3 /*break*/, 17];
                    case 16:
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_c = rows_1.return)) _c.call(rows_1);
                        }
                        finally { if (e_6) throw e_6.error; }
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/, rows];
                    case 18: return [4 /*yield*/, Promise.all(data.map(function (d) { return _this.create({ entity: entity, data: d, txn: txn }); }))];
                    case 19: return [2 /*return*/, _d.sent()];
                }
            });
        });
    };
    /**
     * 同create
     * @param param0
     */
    OakDb.prototype.insert = function (_a, context) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.create({ entity: entity, data: data, txn: txn }, context)];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    OakDb.prototype.insertMany = function (_a, batch, context) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, this.createMany({ entity: entity, data: data, txn: txn }, batch, context)];
            });
        });
    };
    OakDb.prototype.addDeleteAtColumnCheck = function (query, entity) {
        var _this = this;
        var attributes = this.schema[entity].attributes;
        var added = false;
        Object.keys(query).forEach(function (attr) {
            if (Operator_1.LogicOperators.includes(attr)) {
                if (query[attr] instanceof Array) {
                    query[attr].forEach(function (subQuery) { return _this.addDeleteAtColumnCheck(subQuery, entity); });
                }
                else {
                    _this.addDeleteAtColumnCheck(query[attr], entity);
                }
            }
            else {
                if (!added) {
                    lodash_1.assign(query, {
                        $$deleteAt$$: {
                            $exists: false,
                        },
                    }),
                        added = true;
                }
                if (attributes.hasOwnProperty(attr)) {
                    var _a = attributes[attr], type = _a.type, ref = _a.ref;
                    if (type === 'ref') {
                        _this.addDeleteAtColumnCheck(query[attr], ref);
                    }
                }
            }
        });
    };
    /**
     * select entity data
     * if there exists some aggregation fncall in projection, please use stat
     * @param param0
     * @param context
     */
    OakDb.prototype.find = function (_a, context) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, indexFrom = _a.indexFrom, count = _a.count, txn = _a.txn, sort = _a.sort, forUpdate = _a.forUpdate;
        return __awaiter(this, void 0, void 0, function () {
            var attributes, query2, data, beforeTriggers, rows, afterTriggers;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attributes = this.schema[entity].attributes;
                        query2 = query;
                        if (attributes.hasOwnProperty('$$deleteAt$$')) {
                            if (query2) {
                                this.addDeleteAtColumnCheck(query2, entity);
                            }
                            else {
                                query2 = {
                                    $$deleteAt$$: {
                                        $exists: false,
                                    },
                                };
                            }
                        }
                        data = {
                            indexFrom: indexFrom,
                            count: count,
                            projection: projection,
                            query: query2,
                            sort: sort,
                            forUpdate: forUpdate,
                        };
                        beforeTriggers = this.getTriggers({
                            entity: entity,
                            action: 'select',
                            data: data,
                            before: false,
                        });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                data: data,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [4 /*yield*/, this.driver.find({
                            entity: entity,
                            projection: projection,
                            query: query2,
                            indexFrom: indexFrom,
                            count: count,
                            txn: txn,
                            forUpdate: forUpdate,
                            sort: sort,
                        })];
                    case 3:
                        rows = _b.sent();
                        if (!txn) return [3 /*break*/, 5];
                        afterTriggers = this.getTriggers({
                            entity: entity,
                            action: 'select',
                            rows: rows,
                            before: false,
                        });
                        if (!(afterTriggers && afterTriggers.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: afterTriggers,
                                data: data,
                                rows: rows,
                                txn: txn,
                                context: context,
                            })];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [2 /*return*/, rows];
                }
            });
        });
    };
    OakDb.prototype.stat = function (_a, context) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, txn = _a.txn, sort = _a.sort, groupBy = _a.groupBy;
        return __awaiter(this, void 0, void 0, function () {
            var attributes, query2, results;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attributes = this.schema[entity].attributes;
                        query2 = query;
                        if (attributes.hasOwnProperty('$$deleteAt$$')) {
                            if (query2) {
                                this.addDeleteAtColumnCheck(query2, entity);
                            }
                            else {
                                query2 = {
                                    $$deleteAt$$: {
                                        $exists: false,
                                    },
                                };
                            }
                        }
                        return [4 /*yield*/, this.driver.stat({
                                entity: entity,
                                projection: projection,
                                query: query2,
                                groupBy: groupBy,
                                txn: txn,
                                sort: sort,
                            })];
                    case 1:
                        results = _b.sent();
                        return [2 /*return*/, results];
                }
            });
        });
    };
    OakDb.prototype.findById = function (_a, context) {
        var entity = _a.entity, projection = _a.projection, id = _a.id, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var data, beforeTriggers, _b, row, afterTiggers;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        data = {
                            id: id,
                            projection: projection,
                        };
                        beforeTriggers = this.getTriggers({
                            entity: entity,
                            action: 'select',
                            data: data,
                            before: true,
                        });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                data: data,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2: return [4 /*yield*/, this.driver.find({
                            entity: entity,
                            projection: projection,
                            query: { id: id },
                            indexFrom: 0,
                            count: 1,
                            txn: txn,
                        })];
                    case 3:
                        _b = __read.apply(void 0, [_c.sent(), 1]), row = _b[0];
                        if (!(txn && row)) return [3 /*break*/, 5];
                        afterTiggers = this.getTriggers({
                            entity: entity,
                            action: 'select',
                            row: row,
                            data: data,
                            before: false,
                        });
                        if (!(afterTiggers && afterTiggers.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: afterTiggers,
                                row: row,
                                data: data,
                                txn: txn,
                                context: context,
                            })];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/, row];
                }
            });
        });
    };
    OakDb.prototype.preUpdate = function (entity, data, id, row, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var now, row2, _a, beforeTriggers;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        now = Date.now();
                        lodash_1.assign(data, {
                            $$updateAt$$: now,
                        });
                        _a = row;
                        if (_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.findById({ entity: entity, id: id, txn: txn })];
                    case 1:
                        _a = (_b.sent());
                        _b.label = 2;
                    case 2:
                        row2 = _a;
                        beforeTriggers = this.getTriggers({ entity: entity, action: 'update', data: data, row: row2, before: true });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                data: data,
                                row: row || row2,
                                txn: txn,
                                context: context,
                            })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/, row2];
                }
            });
        });
    };
    OakDb.prototype.postUpdate = function (entity, data, row, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var afterTriggers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        afterTriggers = this.getTriggers({ entity: entity, action: 'update', data: data, row: row, before: false });
                        if (!(afterTriggers && afterTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: afterTriggers,
                                data: data,
                                row: row,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    OakDb.prototype.update = function (_a, context) {
        var entity = _a.entity, data = _a.data, id = _a.id, row = _a.row, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var row2, result, rowNow;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        assert_1.default(id || row);
                        return [4 /*yield*/, this.preUpdate(entity, data, id, row, txn, context)];
                    case 1:
                        row2 = _b.sent();
                        return [4 /*yield*/, this.driver.updateById({
                                entity: entity,
                                data: data,
                                id: (id || row.id),
                                txn: txn,
                            })];
                    case 2:
                        result = _b.sent();
                        rowNow = lodash_1.assign({}, row2, data);
                        return [4 /*yield*/, this.postUpdate(entity, data, rowNow, txn, context)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, rowNow];
                }
            });
        });
    };
    OakDb.prototype.updateMany = function (_a) {
        var entity = _a.entity, data = _a.data, query = _a.query, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        lodash_1.assign(data, {
                            $$updateAt$$: Date.now(),
                        });
                        return [4 /*yield*/, this.driver.updateByCondition({
                                entity: entity,
                                data: data,
                                query: query,
                                txn: txn,
                            })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    OakDb.prototype.preRemove = function (entity, id, row, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var attributes, deletePhysically, row2, _a, beforeTriggers;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attributes = this.schema[entity].attributes;
                        deletePhysically = true;
                        if (attributes.hasOwnProperty('$$deleteAt$$')) {
                            deletePhysically = false;
                        }
                        _a = row;
                        if (_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.findById({ entity: entity, id: id, txn: txn })];
                    case 1:
                        _a = (_b.sent());
                        _b.label = 2;
                    case 2:
                        row2 = _a;
                        beforeTriggers = this.getTriggers({ entity: entity, action: 'remove', row: row2, before: true });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                row: row || row2,
                                txn: txn,
                                context: context,
                            })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/, {
                            deletePhysically: deletePhysically,
                            row: row || row2,
                        }];
                }
            });
        });
    };
    OakDb.prototype.postRemove = function (entity, row, txn, context) {
        return __awaiter(this, void 0, void 0, function () {
            var beforeTriggers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        beforeTriggers = this.getTriggers({ entity: entity, action: 'remove', row: row, before: false });
                        if (!(beforeTriggers && beforeTriggers.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.execTriggers({
                                triggers: beforeTriggers,
                                row: row,
                                txn: txn,
                                context: context,
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    OakDb.prototype.remove = function (_a, context) {
        var entity = _a.entity, id = _a.id, row = _a.row, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var _b, deletePhysically, row2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.preRemove(entity, id, row, txn, context)];
                    case 1:
                        _b = _c.sent(), deletePhysically = _b.deletePhysically, row2 = _b.row;
                        if (!deletePhysically) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.driver.removeById({ entity: entity, id: (id || (row2 && row2.id)), txn: txn })];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.driver.updateById({
                            entity: entity,
                            data: {
                                $$deleteAt$$: Date.now(),
                            },
                            id: (id || (row2 && row2.id)), txn: txn
                        })];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [4 /*yield*/, this.postRemove(entity, row2, txn, context)];
                    case 6:
                        _c.sent();
                        return [2 /*return*/, row];
                }
            });
        });
    };
    OakDb.prototype.removeMany = function (_a) {
        var entity = _a.entity, query = _a.query, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var attributes;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attributes = this.schema[entity].attributes;
                        if (!attributes.hasOwnProperty('$$deleteAt$$')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateMany({
                                entity: entity,
                                data: {
                                    $$deleteAt$$: Date.now(),
                                },
                                query: query, txn: txn
                            })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.driver.removeByCondition({
                            entity: entity,
                            query: query,
                            txn: txn,
                        })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OakDb.prototype.judgeRelation = function (entity, attr) {
        return judgeRelation_1.judgeRelation(entity, attr, this.schema);
    };
    OakDb.builtInColumnNames = ['$$createAt$$', '$$updateAt$$', '$$deleteAt$$', 'id', '$$uuid$$'];
    return OakDb;
}(warden_1.Warden));
exports.OakDb = OakDb;
