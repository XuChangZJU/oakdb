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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.MySQL = void 0;
var Driver_1 = require("./Driver");
var Txn_1 = require("../types/Txn");
var MySQLTranslator_1 = require("../translator/MySQLTranslator");
var assert_1 = __importDefault(require("assert"));
var uuid_1 = require("uuid");
var lodash_1 = require("lodash");
var errorCode_1 = require("../errorCode");
function convertGeoTextToObject(geoText) {
    if (geoText.startsWith('POINT')) {
        var coord = geoText.match((/(\d|\.)+(?=\)|\s)/g));
        return {
            type: 'Point',
            coordinates: coord.map(function (ele) { return parseFloat(ele); }),
        };
    }
    else {
        throw errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.unsupportedYet, 'only support Point now');
    }
}
var MySQL = /** @class */ (function (_super) {
    __extends(MySQL, _super);
    function MySQL(options, schema, log) {
        var _this = _super.call(this, options, schema, log) || this;
        _this.debug = false;
        var database = options.database;
        _this.database = database;
        _this.mysql = require('mysql');
        _this.addForeignKeyColumns(_this.schema);
        _this.translator = new MySQLTranslator_1.MySQLTranslator(_this.schema);
        _this.transactions = {};
        return _this;
    }
    MySQL.prototype.getPrimaryKeyType = function () {
        return 'bigint';
    };
    /**
     * 为所有的ref类型创建`${ref}Id`列，并创建外键的索引
     */
    MySQL.prototype.addForeignKeyColumns = function (schema) {
    };
    MySQL.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.mysql.createPool(this.options)];
                    case 1:
                        _a.connectionPool = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connectionPool.end()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.unfoldResult = function (entity, result) {
        var schema = this.schema;
        function resolveAttribute(entity2, r, attr, value) {
            var _a;
            var _b = schema[entity2], attributes = _b.attributes, view = _b.view;
            if (!view) {
                var i = attr.indexOf(".");
                if (i !== -1) {
                    var attrHead = attr.slice(0, i);
                    var attrTail = attr.slice(i + 1);
                    if (!r[attrHead]) {
                        r[attrHead] = {};
                    }
                    assert_1.default(attributes[attrHead] && attributes[attrHead].type === 'ref');
                    resolveAttribute(attributes[attrHead].ref, r[attrHead], attrTail, value);
                }
                else if (attributes[attr]) {
                    var type = attributes[attr].type;
                    switch (type) {
                        case 'date':
                        case 'time': {
                            if (value instanceof Date) {
                                r[attr] = value.valueOf();
                            }
                            else {
                                r[attr] = value;
                            }
                            break;
                        }
                        case 'geometry': {
                            if (typeof value === 'string') {
                                r[attr] = convertGeoTextToObject(value);
                            }
                            else {
                                r[attr] = value;
                            }
                            break;
                        }
                        case 'object': {
                            if (typeof value === 'string') {
                                r[attr] = JSON.parse(value);
                            }
                            else {
                                r[attr] = value;
                            }
                            break;
                        }
                        case 'function': {
                            if (typeof value === 'string') {
                                // 函数的执行环境需要的参数只有创建函数者知悉，只能由上层再创建Function
                                r[attr] = "return " + Buffer.from(value, 'base64').toString();
                            }
                            else {
                                r[attr] = value;
                            }
                            break;
                        }
                        default: {
                            r[attr] = value;
                        }
                    }
                }
                else {
                    r[attr] = value;
                }
            }
            else {
                lodash_1.assign(r, (_a = {},
                    _a[attr] = value,
                    _a));
            }
        }
        function formalizeNullObject(r) {
            var allowFormalize = true;
            for (var attr in r) {
                if (typeof r[attr] === 'object') {
                    if (formalizeNullObject(r[attr])) {
                        r[attr] = null;
                    }
                    else {
                        allowFormalize = false;
                    }
                }
                else if (r[attr] !== null) {
                    allowFormalize = false;
                }
            }
            return allowFormalize;
        }
        function unfoldRow(r) {
            var result2 = {};
            for (var attr in r) {
                var value = r[attr];
                resolveAttribute(entity, result2, attr, value);
            }
            formalizeNullObject(result2);
            return result2;
        }
        if (result instanceof Array) {
            return result.map(function (r) { return unfoldRow(r); });
        }
        return unfoldRow(result);
    };
    MySQL.prototype.translateToOakError = function (err) {
        var code = MySQL.ERR_DICT[err.errno];
        if (code) {
            return errorCode_1.ErrorCode.createError(code, err.sqlMessage);
        }
        return errorCode_1.ErrorCode.createError(errorCode_1.ErrorCode.databaseError, err.sqlMessage);
    };
    MySQL.prototype.exec = function (sql, txn) {
        return __awaiter(this, void 0, void 0, function () {
            var NODE_ENV, result, connection_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        NODE_ENV = process.env.NODE_ENV;
                        if (NODE_ENV && NODE_ENV.toLowerCase() === 'dev') {
                            this.log(sql);
                        }
                        if (!txn) return [3 /*break*/, 2];
                        connection_1 = txn.data;
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                connection_1.query(sql, function (err, result, fields) {
                                    if (err) {
                                        _this.log("sql exec err: " + sql);
                                        return reject(_this.translateToOakError(err));
                                    }
                                    return resolve(result);
                                });
                            })];
                    case 1:
                        result = _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, new Promise(function (resolve, reject) {
                            // if (process.env.DEBUG) {
                            //  console.log(sql);
                            //}
                            _this.connectionPool.query(sql, function (err, result, fields) {
                                if (err) {
                                    _this.log("sql exec err: " + sql);
                                    return reject(_this.translateToOakError(err));
                                }
                                return resolve(result);
                            });
                        })];
                    case 3:
                        result = _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, result];
                }
            });
        });
    };
    MySQL.prototype.init = function (replace, excludes) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, entities_1, entities_1_1, entity, sql, e_1_1;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        entities = Object.keys(this.schema);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 8]);
                        entities_1 = __values(entities), entities_1_1 = entities_1.next();
                        _b.label = 2;
                    case 2:
                        if (!!entities_1_1.done) return [3 /*break*/, 5];
                        entity = entities_1_1.value;
                        if (excludes && excludes.includes(entity)) {
                            return [3 /*break*/, 4];
                        }
                        sql = this.translator.translateCreateEntity(entity, { replace: replace });
                        return [4 /*yield*/, (this.exec(sql))];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        entities_1_1 = entities_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.destroy = function (truncate, excludes) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, entities_2, entities_2_1, entity, sql, e_2_1;
            var e_2, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        entities = Object.keys(this.schema);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 8]);
                        entities_2 = __values(entities), entities_2_1 = entities_2.next();
                        _b.label = 2;
                    case 2:
                        if (!!entities_2_1.done) return [3 /*break*/, 5];
                        entity = entities_2_1.value;
                        if (excludes && excludes.includes(entity)) {
                            return [3 /*break*/, 4];
                        }
                        sql = this.translator.translateDestroyEntity(entity, truncate);
                        return [4 /*yield*/, (this.exec(sql))];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        entities_2_1 = entities_2.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (entities_2_1 && !entities_2_1.done && (_a = entities_2.return)) _a.call(entities_2);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.startTransaction = function (option) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve, reject) {
                            _this.connectionPool.getConnection(function (err, connection) {
                                if (err) {
                                    return reject(err);
                                }
                                var _a = option || {}, readonly = _a.readonly, isolationLevel = _a.isolationLevel;
                                var startTxn = function () {
                                    var sql = 'START TRANSACTION';
                                    if (readonly) {
                                        sql += ' READ ONLY;';
                                    }
                                    else {
                                        sql += ';';
                                    }
                                    connection.query(sql, function (err2) {
                                        var _a;
                                        if (err2) {
                                            return reject(err2);
                                        }
                                        var id = uuid_1.v4();
                                        var txn = new Txn_1.Txn(id, connection);
                                        lodash_1.assign(_this.transactions, (_a = {},
                                            _a[id] = txn,
                                            _a));
                                        resolve(txn);
                                    });
                                };
                                if (isolationLevel) {
                                    connection.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel + ";", function (err2) {
                                        if (err2) {
                                            return reject(err2);
                                        }
                                        startTxn();
                                    });
                                }
                                else {
                                    startTxn();
                                }
                            });
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MySQL.prototype.commitTransaction = function (txn) {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = txn.data;
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                connection.query('COMMIT;', function (err) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    connection.release();
                                    lodash_1.unset(_this.transactions, txn.id);
                                    txn.emit('committed');
                                    resolve();
                                });
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MySQL.prototype.rollbackTransaction = function (txn) {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = txn.data;
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                connection.query('ROLLBACK;', function (err) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    connection.release();
                                    lodash_1.unset(_this.transactions, txn.id);
                                    txn.emit('rollbacked');
                                    resolve();
                                });
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MySQL.prototype.getTransactionById = function (id) {
        return this.transactions[id];
    };
    MySQL.prototype.create = function (_a) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql, insertId;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateInsertRow(entity, [data]);
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        insertId = (_b.sent()).insertId;
                        return [2 /*return*/, this.unfoldResult(entity, __assign({ id: insertId }, data))];
                }
            });
        });
    };
    MySQL.prototype.createMany = function (_a) {
        var entity = _a.entity, data = _a.data, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql, insertId;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateInsertRow(entity, data);
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        insertId = (_b.sent()).insertId;
                        return [2 /*return*/, data.map(function (d, idx) {
                                return _this.unfoldResult(entity, __assign({ id: insertId + idx }, d));
                            })];
                }
            });
        });
    };
    MySQL.prototype.find = function (_a) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, indexFrom = _a.indexFrom, count = _a.count, txn = _a.txn, sort = _a.sort, forUpdate = _a.forUpdate;
        return __awaiter(this, void 0, void 0, function () {
            var sql, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateSelect({
                            entity: entity,
                            projection: projection,
                            query: query,
                            indexFrom: indexFrom,
                            count: count,
                            sort: sort,
                            forUpdate: forUpdate,
                        });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, this.unfoldResult(entity, result)];
                }
            });
        });
    };
    MySQL.prototype.stat = function (_a) {
        var entity = _a.entity, projection = _a.projection, query = _a.query, txn = _a.txn, groupBy = _a.groupBy, sort = _a.sort;
        return __awaiter(this, void 0, void 0, function () {
            var sql, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateSelect({
                            entity: entity,
                            projection: projection,
                            query: query,
                            groupBy: groupBy,
                            sort: sort,
                        });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, this.unfoldResult(entity, result)];
                }
            });
        });
    };
    MySQL.prototype.updateById = function (_a) {
        var entity = _a.entity, data = _a.data, id = _a.id, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateUpdate({
                            entity: entity,
                            data: data,
                            id: id,
                        });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, this.unfoldResult(entity, __assign({ id: id }, data))];
                }
            });
        });
    };
    MySQL.prototype.updateByCondition = function (_a) {
        var entity = _a.entity, data = _a.data, query = _a.query, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateUpdate({
                            entity: entity,
                            data: data,
                            query: query,
                        });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.removeById = function (_a) {
        var entity = _a.entity, id = _a.id, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateRemove({ entity: entity, id: id });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MySQL.prototype.removeByCondition = function (_a) {
        var entity = _a.entity, query = _a.query, txn = _a.txn;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = this.translator.translateRemove({ entity: entity, query: query });
                        return [4 /*yield*/, this.exec(sql, txn)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MySQL.ERR_DICT = {
        1062: errorCode_1.ErrorCode.uniqueConstraintViolated,
        1205: errorCode_1.ErrorCode.lockWaitTimeout,
        1213: errorCode_1.ErrorCode.deadlockDetected,
    };
    return MySQL;
}(Driver_1.Driver));
exports.MySQL = MySQL;
