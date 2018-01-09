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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mysql = require("mysql");
var _debug = require("debug");
var debug = _debug("_dbInterface");
function esc(value) {
    return mysql.escape(value);
}
exports.esc = esc;
function buildQueryFunction(connectionConfig) {
    connectionConfig = __assign({}, connectionConfig, { "multipleStatements": true });
    var connection = undefined;
    return function query(sql, values) {
        return new Promise(function (resolve, reject) {
            if (!connection) {
                connection = mysql.createConnection(connectionConfig);
                query([
                    "SET SESSION wait_timeout=31536000;                             ",
                    "DROP FUNCTION IF EXISTS _ASSERT;                               ",
                    "CREATE FUNCTION _ASSERT(bool INTEGER, message VARCHAR(256))    ",
                    "   RETURNS INTEGER DETERMINISTIC                               ",
                    "BEGIN                                                          ",
                    "    IF bool IS NULL OR bool = 0 THEN                           ",
                    "        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;    ",
                    "    END IF;                                                    ",
                    "    RETURN bool;                                               ",
                    "END;                                                           "
                ].join("\n"));
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
function buildInsertQuery(table, obj, onDuplicateKey) {
    var keys = Object.keys(obj);
    var values = keys.map(function (key) { return obj[key]; });
    var backtickKeys = keys.map(function (key) { return "`" + key + "`"; });
    var sqlLinesArray = [
        "INSERT " + ((onDuplicateKey === "IGNORE") ? "IGNORE " : "") + "INTO `" + table + "` ( " + backtickKeys.join(", ") + " )",
        "VALUES ( " + keys.map(function (key) { return (obj[key] instanceof Object) ? ("@`" + obj[key]["@"] + "`") : esc(obj[key]); }).join(", ") + ")"
    ];
    if (onDuplicateKey === "UPDATE") {
        sqlLinesArray = __spread(sqlLinesArray, [
            "ON DUPLICATE KEY UPDATE",
            backtickKeys.map(function (backtickKey) { return backtickKey + " = VALUES(" + backtickKey + ")"; }).join(", ")
        ]);
    }
    sqlLinesArray[sqlLinesArray.length] = ";\n";
    return sqlLinesArray.join("\n");
}
exports.buildInsertQuery = buildInsertQuery;
function smallIntOrNullToBooleanOrUndefined(v) {
    return (typeof v === "number") ? (v === 1) : undefined;
}
exports.smallIntOrNullToBooleanOrUndefined = smallIntOrNullToBooleanOrUndefined;
function booleanOrUndefinedToSmallIntOrNull(v) {
    return (typeof v === "boolean") ? (v ? 1 : 0) : null;
}
exports.booleanOrUndefinedToSmallIntOrNull = booleanOrUndefinedToSmallIntOrNull;
//TODO: export in mySqlFunctions
exports.b64 = {
    "dec": function (b64Str) {
        return b64Str === null ? undefined : (new Buffer(b64Str, "base64")).toString("utf8");
    },
    "enc": function (str) {
        return str === undefined ? null : (new Buffer(str, "utf8")).toString("base64");
    }
};
function assertSame(o1, o2, errorMessage) {
    if (errorMessage === void 0) { errorMessage = "assertSame error"; }
    try {
        assertSame_(o1, o2, true);
    }
    catch (e) {
        var error = new Error(errorMessage + " (" + e.message + ")");
        error["o1"] = o1;
        error["o2"] = o2;
        throw error;
    }
}
exports.assertSame = assertSame;
function assertSame_(o1, o2, handleArrayAsSet) {
    if (handleArrayAsSet === void 0) { handleArrayAsSet = true; }
    if (o1 instanceof Object) {
        console.assert(o2 instanceof Object, "M1");
        if (handleArrayAsSet && o1 instanceof Array) {
            if (!(o2 instanceof Array)) {
                console.assert(false, "M2");
                return;
            }
            console.assert(o1.length === o2.length, "M3");
            var o2Set = new Set(o2);
            try {
                for (var o1_1 = __values(o1), o1_1_1 = o1_1.next(); !o1_1_1.done; o1_1_1 = o1_1.next()) {
                    var val1 = o1_1_1.value;
                    var isFound = false;
                    try {
                        for (var o2Set_1 = __values(o2Set), o2Set_1_1 = o2Set_1.next(); !o2Set_1_1.done; o2Set_1_1 = o2Set_1.next()) {
                            var val2 = o2Set_1_1.value;
                            try {
                                assertSame_(val1, val2, handleArrayAsSet);
                            }
                            catch (_a) {
                                continue;
                            }
                            isFound = true;
                            o2Set.delete(val2);
                            break;
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (o2Set_1_1 && !o2Set_1_1.done && (_b = o2Set_1.return)) _b.call(o2Set_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    console.assert(isFound, "M4");
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (o1_1_1 && !o1_1_1.done && (_c = o1_1.return)) _c.call(o1_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        else {
            if (o1 instanceof Array) {
                if (!(o2 instanceof Array))
                    throw new Error();
                console.assert(o1.length === o2.length, "M5");
            }
            else {
                assertSame_(Object.keys(o1), Object.keys(o2));
            }
            for (var key in o1) {
                assertSame_(o1[key], o2[key], handleArrayAsSet);
            }
        }
    }
    else {
        console.assert(o1 === o2, "M7, " + o1 + " !== " + o2);
    }
    var e_2, _c, e_1, _b;
}
exports.genDigits = function (n) {
    return (new Array(n))
        .fill("")
        .map(function () { return "" + ~~(Math.random() * 10); })
        .join("");
};
exports.genHexStr = function (n) { return (new Array(n))
    .fill("")
    .map(function () { return (~~(Math.random() * 0x10)).toString(16); })
    .join(""); };
exports.genUtf8Str = function (max) {
    var n = ~~(Math.random() * max);
    n = n ? n : n + 1;
    var arrCode = (new Array(n)).fill(NaN).map(function () { return ~~(Math.random() * (65535 + 1)); });
    var str = arrCode.map(function (code) { return String.fromCharCode(code); }).join("");
    str = (new Buffer(str, "utf8")).toString("utf8");
    return str;
};
