"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
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
Object.defineProperty(exports, "__esModule", { value: true });
var mysql = require("mysql");
var _debug = require("debug");
var debug = _debug("_dbInterface");
function buildQueryFunction(connectionConfig) {
    connectionConfig = __assign({}, connectionConfig, { "multipleStatements": true });
    var connection = undefined;
    return function query(sql, values) {
        return new Promise(function (resolve, reject) {
            if (!connection) {
                connection = mysql.createConnection(connectionConfig);
                query("SET SESSION wait_timeout=31536000");
            }
            connection.query(sql, values || [], function (error, results) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(results);
            });
        });
    };
}
exports.buildQueryFunction = buildQueryFunction;
function buildQueryFunctionSafe(connectionConfig) {
    var poolConfig = __assign({}, connectionConfig, { "connectionLimit": 1, "multipleStatements": true });
    var pool = undefined;
    return function query(sql, values) {
        return new Promise(function (resolve, reject) {
            if (!pool) {
                pool = mysql.createPool(poolConfig);
                setInterval(function () { return query("SELECT 1"); }, 14400000);
            }
            pool.getConnection(function (error, connection) {
                if (error) {
                    reject(error);
                    return;
                }
                connection.query(sql, values || [], function (error, results) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    connection.release();
                    resolve(results);
                });
            });
        });
    };
}
exports.buildQueryFunctionSafe = buildQueryFunctionSafe;
function buildInsertOrUpdateQuery(table, values) {
    return __buildInsertQuery__(table, values, true);
}
exports.buildInsertOrUpdateQuery = buildInsertOrUpdateQuery;
function buildInsertQuery(table, values) {
    return __buildInsertQuery__(table, values, false);
}
exports.buildInsertQuery = buildInsertQuery;
function __buildInsertQuery__(table, obj, update) {
    var keys = Object.keys(obj);
    var values = keys.map(function (key) { return obj[key]; });
    var backtickKeys = keys.map(function (key) { return "`" + key + "`"; });
    var sqlLinesArray = [
        "INSERT INTO `" + table + "` ( " + backtickKeys.join(", ") + " )",
        "VALUES ( " + keys.map(function (key) { return (obj[key] instanceof Object) ? ("@`" + obj[key]["@"] + "`") : "?"; }).join(", ") + ")"
    ];
    if (update)
        sqlLinesArray = __spread(sqlLinesArray, [
            "ON DUPLICATE KEY UPDATE",
            backtickKeys.map(function (backtickKey) { return backtickKey + " = VALUES(" + backtickKey + ")"; }).join(", ")
        ]);
    sqlLinesArray[sqlLinesArray.length] = ";\n";
    return [
        sqlLinesArray.join("\n"),
        keys.filter(function (key) { return !(obj[key] instanceof Object); }).map(function (key) { return obj[key]; })
    ];
}
function smallIntOrNullToBooleanOrUndefined(v) {
    return (typeof v === "number") ? (v === 1) : undefined;
}
exports.smallIntOrNullToBooleanOrUndefined = smallIntOrNullToBooleanOrUndefined;
function booleanOrUndefinedToSmallIntOrNull(v) {
    return (typeof v === "boolean") ? (v ? 1 : 0) : null;
}
exports.booleanOrUndefinedToSmallIntOrNull = booleanOrUndefinedToSmallIntOrNull;
