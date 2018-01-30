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
function getUtils(connectionConfig, handleStringEncoding) {
    connectionConfig = __assign({}, connectionConfig, { "multipleStatements": true });
    var esc = function (value) {
        if (handleStringEncoding && typeof value === "string") {
            value = (new Buffer(value, "utf8")).toString("binary");
        }
        return mysql.escape(value);
    };
    var buildInsertQuery = function (table, obj, onDuplicateKey) {
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
    };
    var connection = undefined;
    var query = function (sql) { return new Promise(function (resolve, reject) {
        if (!connection) {
            connection = mysql.createConnection(connectionConfig);
            query([
                "SET SESSION wait_timeout=31536000;",
                "DROP FUNCTION IF EXISTS _ASSERT;",
                "CREATE FUNCTION _ASSERT(bool INTEGER, message VARCHAR(256))",
                "   RETURNS INTEGER DETERMINISTIC",
                "BEGIN",
                "    IF bool IS NULL OR bool = 0 THEN",
                "        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;",
                "    END IF;",
                "    RETURN bool;",
                "END;"
            ].join("\n"));
        }
        connection.query(sql, function (error, results) {
            if (error) {
                reject(error);
                return;
            }
            if (handleStringEncoding && (results instanceof Array) && results.length) {
                if (Object.getPrototypeOf(results[0]).constructor.name === "RowDataPacket") {
                    getUtils.decodeOkPacketsStrings(results);
                }
                else {
                    try {
                        for (var results_1 = __values(results), results_1_1 = results_1.next(); !results_1_1.done; results_1_1 = results_1.next()) {
                            var result = results_1_1.value;
                            if (result instanceof Array) {
                                getUtils.decodeOkPacketsStrings(result);
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (results_1_1 && !results_1_1.done && (_a = results_1.return)) _a.call(results_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            }
            // [ OkPacket, OkPacket, [ RowDataPacket... ] ]
            resolve(results);
            var e_1, _a;
        });
    }); };
    return { query: query, esc: esc, buildInsertQuery: buildInsertQuery };
}
exports.getUtils = getUtils;
(function (getUtils) {
    function decodeOkPacketsStrings(rows) {
        try {
            for (var rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                var row = rows_1_1.value;
                for (var key in row) {
                    if (typeof row[key] === "string") {
                        row[key] = (new Buffer(row[key], "binary")).toString("utf8");
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var e_2, _a;
    }
    getUtils.decodeOkPacketsStrings = decodeOkPacketsStrings;
})(getUtils = exports.getUtils || (exports.getUtils = {}));
var bool;
(function (bool) {
    function enc(b) {
        return (b === undefined) ? null : (b ? 1 : 0);
    }
    bool.enc = enc;
    function dec(t) {
        return (t === null) ? undefined : (t === 1);
    }
    bool.dec = dec;
})(bool = exports.bool || (exports.bool = {}));
function assertSame(o1, o2, errorMessage) {
    if (errorMessage === void 0) { errorMessage = "assertSame error"; }
    try {
        assertSame.perform(o1, o2, true);
    }
    catch (e) {
        var error = new Error(errorMessage + " (" + e.message + ")");
        error["o1"] = o1;
        error["o2"] = o2;
        throw error;
    }
}
exports.assertSame = assertSame;
(function (assertSame) {
    function perform(o1, o2, handleArrayAsSet) {
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
                                    perform(val1, val2, handleArrayAsSet);
                                }
                                catch (_a) {
                                    continue;
                                }
                                isFound = true;
                                o2Set.delete(val2);
                                break;
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (o2Set_1_1 && !o2Set_1_1.done && (_b = o2Set_1.return)) _b.call(o2Set_1);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        console.assert(isFound, "M4");
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (o1_1_1 && !o1_1_1.done && (_c = o1_1.return)) _c.call(o1_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            else {
                if (o1 instanceof Array) {
                    if (!(o2 instanceof Array))
                        throw new Error();
                    console.assert(o1.length === o2.length, "M5");
                }
                else {
                    perform(Object.keys(o1), Object.keys(o2));
                }
                for (var key in o1) {
                    perform(o1[key], o2[key], handleArrayAsSet);
                }
            }
        }
        else {
            console.assert(o1 === o2, "M7, " + o1 + " !== " + o2);
        }
        var e_4, _c, e_3, _b;
    }
    assertSame.perform = perform;
})(assertSame = exports.assertSame || (exports.assertSame = {}));
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
function genUtf8Str(length, restrict) {
    var charGenerator;
    switch (restrict) {
        case undefined:
            charGenerator = genUtf8Str.genUtf8Char;
            break;
        case "ONLY 1 BYTE CHAR":
            charGenerator = genUtf8Str.genUtf8Char1B;
            break;
        case "ONLY 4 BYTE CHAR":
            charGenerator = genUtf8Str.genUtf8Char4B;
            break;
    }
    return (new Array(length)).fill("").map(function () { return charGenerator(); }).join("");
}
exports.genUtf8Str = genUtf8Str;
(function (genUtf8Str) {
    /** "11110000" => "f0" */
    function bitStrToHexStr(bin) {
        var hexChars = [];
        var i = 0;
        while (bin[i] !== undefined) {
            var fourBits = "" + bin[i] + bin[i + 1] + bin[i + 2] + bin[i + 3];
            var hexChar = parseInt(fourBits, 2).toString(16);
            hexChars.push(hexChar);
            i = i + 4;
        }
        return hexChars.join("");
    }
    ;
    /** 8 => "11010001"  */
    function genBitStr(length) {
        return (new Array(length)).fill("").map(function () { return "" + ~~(Math.random() * 2); }).join("");
    }
    /** throw error if hex does not represent a valid utf8 string */
    function hexStrToUtf8Str(hex) {
        var str = (new Buffer(hex, "hex")).toString("utf8");
        if ((new Buffer(str, "utf8")).toString("hex") !== hex) {
            throw new Error("Not valid UTF8 data");
        }
        return str;
    }
    /** return a random utf8 char that fit on one byte */
    function genUtf8Char1B() {
        var bin = "0" + genBitStr(7);
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char1B();
        }
    }
    genUtf8Str.genUtf8Char1B = genUtf8Char1B;
    genUtf8Str.genUtf8Char2B = function () {
        var bin = "110" + genBitStr(5) + "10" + genBitStr(6);
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Str.genUtf8Char2B();
        }
    };
    function genUtf8Char3B(rand) {
        if (rand === undefined) {
            rand = ~~(Math.random() * 8);
        }
        var bin;
        switch (rand) {
            case 0:
                bin = "11100000101" + genBitStr(5) + "10" + genBitStr(6);
                break;
            case 1:
                bin = "1110000110" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 2:
                bin = "1110001" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 3:
                bin = "111001" + genBitStr(2) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 4:
                bin = "111010" + genBitStr(2) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 5:
                bin = "1110110010" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 6:
                bin = "11101101100" + genBitStr(5) + "10" + genBitStr(6);
                break;
            case 7:
                bin = "1110111" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
        }
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char3B();
        }
    }
    genUtf8Str.genUtf8Char3B = genUtf8Char3B;
    ;
    function genUtf8Char4B(rand) {
        if (rand === undefined) {
            rand = ~~(Math.random() * 5);
        }
        var bin;
        switch (rand) {
            case 0:
                bin = "111100001001" + genBitStr(4) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 1:
                bin = "11110000101" + genBitStr(5) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 2:
                bin = "1111000110" + genBitStr(6) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 3:
                bin = "1111001" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 4:
                bin = "111101001000" + genBitStr(4) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
        }
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char4B();
        }
    }
    genUtf8Str.genUtf8Char4B = genUtf8Char4B;
    ;
    function genUtf8Char() {
        var rand = ~~(Math.random() * 4);
        switch (rand) {
            case 0: return genUtf8Char1B();
            case 1: return genUtf8Str.genUtf8Char2B();
            case 2: return genUtf8Char3B();
            case 3: return genUtf8Char4B();
        }
    }
    genUtf8Str.genUtf8Char = genUtf8Char;
    ;
})(genUtf8Str = exports.genUtf8Str || (exports.genUtf8Str = {}));
