"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
function connectAndGetApi(connectionConfig, handleStringEncoding) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = mysql.createConnection(Object.assign({}, connectionConfig, { "multipleStatements": true }));
        //TODO: see if ok
        yield new Promise((resolve, reject) => connection.connect(error => error ? reject(error) : resolve()));
        const esc = value => {
            if (handleStringEncoding && typeof value === "string") {
                value = Buffer.from(value, "utf8").toString("binary");
            }
            return mysql.escape(value);
        };
        const buildInsertQuery = (table, obj, onDuplicateKeyAction) => {
            let keys = Object.keys(obj);
            let backtickKeys = keys.map(key => "`" + key + "`");
            let sqlLinesArray = [
                `INSERT ${(onDuplicateKeyAction === "IGNORE") ? "IGNORE " : ""}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
                `VALUES ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]["@"] + "`") : esc(obj[key])).join(", ")})`
            ];
            if (onDuplicateKeyAction === "UPDATE") {
                sqlLinesArray = [
                    ...sqlLinesArray,
                    "ON DUPLICATE KEY UPDATE",
                    backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", ")
                ];
            }
            sqlLinesArray[sqlLinesArray.length] = ";\n";
            return sqlLinesArray.join("\n");
        };
        const query = sql => new Promise((resolve, reject) => connection.query(sql, (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            if (handleStringEncoding && (results instanceof Array) && results.length) {
                if (Object.getPrototypeOf(results[0]).constructor.name === "RowDataPacket") {
                    connectAndGetApi.decodeOkPacketsStrings(results);
                }
                else {
                    for (let result of results) {
                        if (result instanceof Array) {
                            connectAndGetApi.decodeOkPacketsStrings(result);
                        }
                    }
                }
            }
            resolve(results);
        }));
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
        return { query, esc, buildInsertQuery };
    });
}
exports.connectAndGetApi = connectAndGetApi;
(function (connectAndGetApi) {
    function decodeOkPacketsStrings(rows) {
        for (let row of rows) {
            for (let key in row) {
                if (typeof row[key] === "string") {
                    row[key] = (new Buffer(row[key], "binary")).toString("utf8");
                }
            }
        }
    }
    connectAndGetApi.decodeOkPacketsStrings = decodeOkPacketsStrings;
})(connectAndGetApi = exports.connectAndGetApi || (exports.connectAndGetApi = {}));
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
