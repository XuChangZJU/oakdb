"use strict";
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
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
exports.Warden = void 0;
var errorCode_1 = require("./errorCode");
var utils_1 = require("./utils");
var assert_1 = __importDefault(require("assert"));
var lodash_1 = require("lodash");
var oakDb_1 = require("./oakDb");
var Warden = /** @class */ (function () {
    function Warden(schema, log) {
        this.triggerActionStore = new Map();
        this.triggerNameStore = new Map();
        this.log = log || console.log;
        // 为对象增加volatile需要的metadata域
        Object.keys(schema).forEach(function (entity) {
            var attributes = schema[entity].attributes;
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
    Warden.prototype.registerTrigger = function (trigger) {
        var name = trigger.name, entity = trigger.entity, action = trigger.action, before = trigger.before, volatile = trigger.volatile;
        assert_1.default(!before || !volatile); // 一个trigger不可能同时满足这两个吧
        var action2 = Warden.ActionAlias[action];
        assert_1.default(action2);
        var key = entity + "-" + action2;
        var _a = this, triggerActionStore = _a.triggerActionStore, triggerNameStore = _a.triggerNameStore;
        if (triggerActionStore.has(key)) {
            var triggers = triggerActionStore.get(key);
            triggers.push(trigger);
        }
        else {
            var triggers = [];
            triggers.push(trigger);
            triggerActionStore.set(key, triggers);
        }
        assert_1.default(!triggerNameStore.has(name), "\u51FA\u73B0\u4E86\u91CD\u540D\u7684\u5B9A\u4E49\u7684trigger\u3002\u3010" + name + "\u3011");
        triggerNameStore.set(name, trigger);
    };
    Warden.prototype.getTriggers = function (_a) {
        var entity = _a.entity, action = _a.action, data = _a.data, row = _a.row, rows = _a.rows, before = _a.before;
        var action2 = Warden.ActionAlias[action];
        assert_1.default(action2);
        var key = entity + "-" + action2;
        var triggerStore = this.triggerActionStore;
        var triggers = triggerStore.get(key);
        if (triggers) {
            var volatileData_1 = [];
            var validTriggers = triggers.filter(function (trigger) {
                var valueCheck = trigger.valueCheck, name = trigger.name, volatile = trigger.volatile;
                if (before !== !!trigger.before) {
                    return false;
                }
                var valueCheckResult = !trigger.valueCheck || trigger.valueCheck({ row: row, rows: rows, data: data });
                var attrCheckResult = !trigger.attributes || !data
                    || (trigger.attributes instanceof Array && lodash_1.intersection(trigger.attributes, Object.keys(data)).length > 0)
                    || Object.keys(data).includes(trigger.attributes);
                var checkResult = valueCheckResult && attrCheckResult;
                if (checkResult === true && volatile === 'makeSure') {
                    volatileData_1.push({
                        name: name,
                        data: lodash_1.cloneDeep(data),
                    });
                }
                return checkResult;
            });
            if (volatileData_1.length > 0) {
                if (row && row.$$volatileTimestamp$$) {
                    throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.volatileTriggerUncompleted, 'volatile trigger must be completed serially');
                }
                lodash_1.assign(data, {
                    $$volatileTimestamp$$: Date.now(),
                    $$volatileData$$: volatileData_1,
                });
            }
            if (validTriggers.length > 0) {
                return validTriggers;
            }
        }
    };
    Warden.prototype.getCount = function (result) {
        if (typeof result === 'number') {
            return result;
        }
        else if (result instanceof Array) {
            return result.length;
        }
        else {
            return 1;
        }
    };
    Warden.prototype.doTrigger = function (_a, context) {
        var trigger = _a.trigger, txn = _a.txn, row = _a.row, rows = _a.rows, data = _a.data;
        return __awaiter(this, void 0, void 0, function () {
            var triggerCondition, triggerEntity, triggerProjection, fn, group, name, execFn, query, _b, that, triggeredRows, result, result;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        triggerCondition = trigger.triggerCondition, triggerEntity = trigger.triggerEntity, triggerProjection = trigger.triggerProjection, fn = trigger.fn, group = trigger.group, name = trigger.name;
                        execFn = function (triggerInput) { return __awaiter(_this, void 0, void 0, function () {
                            var result, count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fn(triggerInput, context)];
                                    case 1:
                                        result = _a.sent();
                                        count = this.getCount(result);
                                        this.log("trigger " + name + " executed successfully, affects " + count + " rows");
                                        return [2 /*return*/, result];
                                }
                            });
                        }); };
                        if (!triggerEntity) return [3 /*break*/, 8];
                        _b = triggerCondition;
                        if (!_b) return [3 /*break*/, 2];
                        return [4 /*yield*/, triggerCondition({ row: row, data: data, txn: txn })];
                    case 1:
                        _b = (_c.sent());
                        _c.label = 2;
                    case 2:
                        query = _b;
                        that = this;
                        while (Object.getPrototypeOf(that) !== oakDb_1.OakDb.prototype) {
                            that = Object.getPrototypeOf(that);
                        }
                        return [4 /*yield*/, Object.getPrototypeOf(that).find.call(this, {
                                entity: triggerEntity,
                                projection: triggerProjection,
                                query: query,
                            }, context)];
                    case 3:
                        triggeredRows = _c.sent();
                        if (!group) return [3 /*break*/, 5];
                        return [4 /*yield*/, execFn({
                                txn: txn,
                                row: row,
                                rows: rows,
                                data: data,
                                triggeredRows: triggeredRows,
                            })];
                    case 4:
                        result = _c.sent();
                        return [2 /*return*/, result];
                    case 5: return [4 /*yield*/, utils_1.parallel(triggeredRows.map(function (triggeredRow) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, execFn({
                                            txn: txn,
                                            row: row,
                                            rows: rows,
                                            data: data,
                                            triggeredRow: triggeredRow,
                                        })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); }))];
                    case 6:
                        result = _c.sent();
                        return [2 /*return*/, result];
                    case 7: return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, execFn({
                            txn: txn,
                            row: row,
                            rows: rows,
                            data: data,
                        })];
                    case 9: return [2 /*return*/, _c.sent()];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    Warden.prototype.doTriggerAgain = function (_a, context) {
        var trigger = _a.trigger, row = _a.row, rows = _a.rows, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var entity, volatile, name, result, volatileData, updateData, that;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        entity = trigger.entity, volatile = trigger.volatile, name = trigger.name;
                        return [4 /*yield*/, this.doTrigger({
                                txn: txn,
                                row: row,
                                rows: rows,
                                data: data,
                                trigger: trigger,
                            }, context)];
                    case 1:
                        result = _b.sent();
                        if (!(volatile === 'makeSure')) return [3 /*break*/, 3];
                        volatileData = row.$$volatileData$$;
                        lodash_1.remove(volatileData, function (vd) { return vd.name === name; });
                        updateData = {
                            $$volatileData$$: volatileData,
                        };
                        if (volatileData.length === 0) {
                            lodash_1.assign(updateData, {
                                $$volatileTimestamp$$: null,
                                $$volatileData$$: null,
                            });
                        }
                        that = this;
                        while (Object.getPrototypeOf(that) !== oakDb_1.OakDb.prototype) {
                            that = Object.getPrototypeOf(that);
                        }
                        return [4 /*yield*/, Object.getPrototypeOf(that).update.call(this, {
                                entity: entity,
                                data: updateData,
                                row: row,
                                txn: txn,
                            }, context)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, result];
                }
            });
        });
    };
    Warden.prototype.execTriggers = function (_a) {
        var triggers = _a.triggers, row = _a.row, rows = _a.rows, data = _a.data, txn = _a.txn, context = _a.context;
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(triggers.length > 0)) return [3 /*break*/, 2];
                        promises = triggers.map(function (trigger) { return function () { return __awaiter(_this, void 0, void 0, function () {
                            var triggerCondition, triggerEntity, triggerProjection, volatile, fn, group, entity;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        triggerCondition = trigger.triggerCondition, triggerEntity = trigger.triggerEntity, triggerProjection = trigger.triggerProjection, volatile = trigger.volatile, fn = trigger.fn, group = trigger.group, entity = trigger.entity;
                                        if (!(volatile && txn)) return [3 /*break*/, 1];
                                        assert_1.default(row);
                                        // 挂到事务提交时再做
                                        txn && txn.on('committed', function () { return __awaiter(_this, void 0, void 0, function () {
                                            var txn, err_1;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, this.startTransaction()];
                                                    case 1:
                                                        txn = _a.sent();
                                                        _a.label = 2;
                                                    case 2:
                                                        _a.trys.push([2, 5, , 7]);
                                                        return [4 /*yield*/, this.doTriggerAgain({
                                                                trigger: trigger,
                                                                row: row,
                                                                rows: rows,
                                                                data: data,
                                                                txn: txn,
                                                            }, context)];
                                                    case 3:
                                                        _a.sent();
                                                        return [4 /*yield*/, this.commitTransaction(txn)];
                                                    case 4:
                                                        _a.sent();
                                                        return [3 /*break*/, 7];
                                                    case 5:
                                                        err_1 = _a.sent();
                                                        return [4 /*yield*/, this.rollbackTransaction(txn)];
                                                    case 6:
                                                        _a.sent();
                                                        this.log(err_1);
                                                        throw err_1;
                                                    case 7: return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                        return [3 /*break*/, 3];
                                    case 1: return [4 /*yield*/, this.doTrigger({
                                            txn: txn,
                                            trigger: trigger,
                                            row: row,
                                            rows: rows,
                                            data: data,
                                        }, context)];
                                    case 2: return [2 /*return*/, _a.sent()];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }; });
                        return [4 /*yield*/, utils_1.parallel(promises.map(function (p) { return p(); }))];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * find the volatile triggers are not done properly, then do them again.
     * @params interval: delay(millisecond) for the volatile triggers will be executed.
     */
    Warden.prototype.patrol = function (interval, context) {
        if (interval === void 0) { interval = 60000; }
        return __awaiter(this, void 0, void 0, function () {
            var entities, now, promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        entities = __spread(this.triggerNameStore.values()).filter(function (trigger) { return trigger.volatile === 'makeSure'; }).map(function (trigger) { return trigger.entity; });
                        now = Date.now();
                        promises = entities.map(function (entity) { return function () { return __awaiter(_this, void 0, void 0, function () {
                            var txn, that, rows, rows_1, rows_1_1, row2, id, $$volatileData$$, $$volatileData$$_1, $$volatileData$$_1_1, vdItem, name_1, data, trigger, e_1_1, e_2_1, err_2;
                            var e_2, _a, e_1, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, this.startTransaction()];
                                    case 1:
                                        txn = _c.sent();
                                        _c.label = 2;
                                    case 2:
                                        _c.trys.push([2, 20, , 22]);
                                        that = this;
                                        while (Object.getPrototypeOf(that) !== oakDb_1.OakDb.prototype) {
                                            that = Object.getPrototypeOf(that);
                                        }
                                        return [4 /*yield*/, Object.getPrototypeOf(that).find.call(this, {
                                                entity: entity,
                                                txn: txn,
                                                projection: {
                                                    id: 1,
                                                    $$volatileData$$: 1,
                                                },
                                                query: {
                                                    $$volatileTimestamp$$: {
                                                        $lt: now - interval,
                                                    },
                                                },
                                            }, context)];
                                    case 3:
                                        rows = _c.sent();
                                        if (!(rows.length > 0)) return [3 /*break*/, 18];
                                        _c.label = 4;
                                    case 4:
                                        _c.trys.push([4, 15, 16, 17]);
                                        rows_1 = __values(rows), rows_1_1 = rows_1.next();
                                        _c.label = 5;
                                    case 5:
                                        if (!!rows_1_1.done) return [3 /*break*/, 14];
                                        row2 = rows_1_1.value;
                                        id = row2.id, $$volatileData$$ = row2.$$volatileData$$;
                                        _c.label = 6;
                                    case 6:
                                        _c.trys.push([6, 11, 12, 13]);
                                        $$volatileData$$_1 = (e_1 = void 0, __values($$volatileData$$)), $$volatileData$$_1_1 = $$volatileData$$_1.next();
                                        _c.label = 7;
                                    case 7:
                                        if (!!$$volatileData$$_1_1.done) return [3 /*break*/, 10];
                                        vdItem = $$volatileData$$_1_1.value;
                                        name_1 = vdItem.name, data = vdItem.data;
                                        trigger = this.triggerNameStore.get(name_1);
                                        return [4 /*yield*/, this.doTriggerAgain({ trigger: trigger, txn: txn, row: row2, data: data }, context)];
                                    case 8:
                                        _c.sent();
                                        _c.label = 9;
                                    case 9:
                                        $$volatileData$$_1_1 = $$volatileData$$_1.next();
                                        return [3 /*break*/, 7];
                                    case 10: return [3 /*break*/, 13];
                                    case 11:
                                        e_1_1 = _c.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 13];
                                    case 12:
                                        try {
                                            if ($$volatileData$$_1_1 && !$$volatileData$$_1_1.done && (_b = $$volatileData$$_1.return)) _b.call($$volatileData$$_1);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                        return [7 /*endfinally*/];
                                    case 13:
                                        rows_1_1 = rows_1.next();
                                        return [3 /*break*/, 5];
                                    case 14: return [3 /*break*/, 17];
                                    case 15:
                                        e_2_1 = _c.sent();
                                        e_2 = { error: e_2_1 };
                                        return [3 /*break*/, 17];
                                    case 16:
                                        try {
                                            if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                        return [7 /*endfinally*/];
                                    case 17:
                                        this.log("complete " + rows.length + " volatile triggers on " + entity + " in the patrol");
                                        _c.label = 18;
                                    case 18: return [4 /*yield*/, this.commitTransaction(txn)];
                                    case 19:
                                        _c.sent();
                                        return [3 /*break*/, 22];
                                    case 20:
                                        err_2 = _c.sent();
                                        return [4 /*yield*/, this.rollbackTransaction(txn)];
                                    case 21:
                                        _c.sent();
                                        throw err_2;
                                    case 22: return [2 /*return*/];
                                }
                            });
                        }); }; });
                        return [4 /*yield*/, utils_1.parallel(promises.map(function (p) { return p(); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
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
    return Warden;
}());
exports.Warden = Warden;
