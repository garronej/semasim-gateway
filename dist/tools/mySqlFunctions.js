"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
function getUtils(connectionConfig, handleStringEncoding) {
    connectionConfig = Object.assign({}, connectionConfig, { "multipleStatements": true });
    let esc = (value) => {
        if (handleStringEncoding && typeof value === "string") {
            value = Buffer.from(value, "utf8").toString("binary");
        }
        return mysql.escape(value);
    };
    let buildInsertQuery = function (table, obj, onDuplicateKey) {
        let keys = Object.keys(obj);
        let backtickKeys = keys.map(key => "`" + key + "`");
        let sqlLinesArray = [
            `INSERT ${(onDuplicateKey === "IGNORE") ? "IGNORE " : ""}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
            `VALUES ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]["@"] + "`") : esc(obj[key])).join(", ")})`
        ];
        if (onDuplicateKey === "UPDATE") {
            sqlLinesArray = [
                ...sqlLinesArray,
                "ON DUPLICATE KEY UPDATE",
                backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", ")
            ];
        }
        sqlLinesArray[sqlLinesArray.length] = ";\n";
        return sqlLinesArray.join("\n");
    };
    let connection = undefined;
    let query = (sql) => new Promise((resolve, reject) => {
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
        connection.query(sql, (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            if (handleStringEncoding && (results instanceof Array) && results.length) {
                if (Object.getPrototypeOf(results[0]).constructor.name === "RowDataPacket") {
                    getUtils.decodeOkPacketsStrings(results);
                }
                else {
                    for (let result of results) {
                        if (result instanceof Array) {
                            getUtils.decodeOkPacketsStrings(result);
                        }
                    }
                }
            }
            // [ OkPacket, OkPacket, [ RowDataPacket... ] ]
            resolve(results);
        });
    });
    return { query, esc, buildInsertQuery };
}
exports.getUtils = getUtils;
(function (getUtils) {
    function decodeOkPacketsStrings(rows) {
        for (let row of rows) {
            for (let key in row) {
                if (typeof row[key] === "string") {
                    row[key] = (new Buffer(row[key], "binary")).toString("utf8");
                }
            }
        }
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
