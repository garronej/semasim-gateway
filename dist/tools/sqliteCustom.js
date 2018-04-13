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
const sqlite = require("sqlite");
const runExclusive = require("run-exclusive");
function connectAndGetApi(db_path, handleStringEncoding) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield sqlite.open(db_path, { "promise": Promise });
        const esc = value => {
            if (handleStringEncoding && typeof value === "string") {
                value = Buffer.from(value, "utf8").toString("binary");
            }
            return mysql.escape(value);
        };
        const buildInsertQuery = (table, obj, onDuplicateKeyAction) => {
            let keys = Object.keys(obj);
            let backtickKeys = keys.map(key => "`" + key + "`");
            let onDuplicate = (() => {
                switch (onDuplicateKeyAction) {
                    case "IGNORE": return " OR IGNORE ";
                    case "REPLACE": return " OR REPLACE ";
                    case "THROW ERROR": return " ";
                }
            })();
            return [
                `INSERT${onDuplicate}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
                `VALUES ( ${keys.map(key => esc(obj[key])).join(", ")})`,
                ";",
                ""
            ].join("\n");
        };
        const query = runExclusive.build((sql) => __awaiter(this, void 0, void 0, function* () {
            let queries = sql.split(";")
                .filter(part => !!part)
                .map(query => query.replace("\n", ""));
            let results = [];
            for (let query of queries) {
                if (!!query.match(/^SELECT/)) {
                    let rows = yield db.all(query);
                    if (handleStringEncoding) {
                        connectAndGetApi.decodeOkPacketsStrings(rows);
                    }
                    results.push(rows);
                }
                else {
                    results.push((yield db.run(query))["stmt"]);
                }
            }
            return (results.length === 1) ? results[0] : results;
        }));
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
