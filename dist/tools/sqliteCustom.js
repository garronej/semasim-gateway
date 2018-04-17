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
const sqlite = require("sqlite");
const runExclusive = require("run-exclusive");
let logEnable = false;
function enableLog() {
    console.log("enable sqlite log");
    logEnable = true;
}
exports.enableLog = enableLog;
function disableLog() {
    console.log("disable sqlite log");
    logEnable = false;
}
exports.disableLog = disableLog;
var valueAlloc;
(function (valueAlloc) {
    let counter = 0;
    const map = new Map();
    function alloc(value) {
        if (value === undefined) {
            throw new Error("Alloc 'undefined' which is not a SQL valid type");
        }
        let ref = `\$${counter++}`;
        map.set(ref, value);
        return ref;
    }
    valueAlloc.alloc = alloc;
    function retrieve(ref) {
        let value = map.get(ref);
        if (value === undefined) {
            throw new Error("sqliteCustom error, value freed");
        }
        process.nextTick(() => map.delete(ref));
        return value;
    }
    valueAlloc.retrieve = retrieve;
})(valueAlloc || (valueAlloc = {}));
function connectAndGetApi(db_path, handleStringEncoding) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield sqlite.open(db_path, { "promise": Promise });
        yield db.get("PRAGMA foreign_keys = ON");
        yield db.get("PRAGMA temp_store = 2");
        yield db.get("DROP TABLE IF EXISTS _variables");
        yield db.get([
            "CREATE TEMP TABLE _variables (",
            "name TEXT PRIMARY KEY,",
            "integer_value INTEGER,",
            "text_value TEXT",
            ")"
        ].join("\n"));
        const buildSetVarQuery = (varName, varType, sql) => {
            return `INSERT OR REPLACE INTO _variables ( name, ${varType} ) VALUES ( '${varName}', ( ${sql} ) )\n;\n`;
        };
        const buildGetVarQuery = (varName) => {
            return `( SELECT coalesce(integer_value, text_value) FROM _variables WHERE name='${varName}' LIMIT 1 )`;
        };
        const esc = value => {
            if (handleStringEncoding && typeof value === "string") {
                value = Buffer.from(value, "utf8").toString("binary");
            }
            return valueAlloc.alloc(value);
        };
        const buildInsertQuery = (table, values, onDuplicateKeyAction) => {
            let keys = Object.keys(values);
            let backtickKeys = keys.map(key => "`" + key + "`");
            let onDuplicate = (() => {
                switch (onDuplicateKeyAction) {
                    case "IGNORE": return " OR IGNORE ";
                    case "THROW ERROR": return " ";
                }
            })();
            return [
                `INSERT${onDuplicate}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
                `VALUES ( ${keys.map(key => esc(values[key])).join(", ")})`,
                ";",
                ""
            ].join("\n");
        };
        const buildInsertOrUpdateQueries = (table, values, table_key) => {
            let sql = buildInsertQuery(table, values, "IGNORE");
            const _eq = (key) => `\`${key}\`=${esc(values[key])}`;
            let not_table_key = Object.keys(values).filter(key => table_key.indexOf(key) < 0);
            let _set = not_table_key.map(_eq).join(", ");
            let _where = [
                ...table_key.map(_eq),
                [
                    "NOT ( ",
                    not_table_key.map(key => (key !== null) ?
                        `( \`${key}\` IS NOT NULL AND ${_eq(key)} )` :
                        `\`${key}\` IS NULL`).join(" AND "),
                    " ) "
                ].join("")
            ].join(" AND ");
            sql += `UPDATE \`${table}\` SET ${_set} WHERE ${_where}\n;\n`;
            return sql;
        };
        const query = runExclusive.build((sql) => __awaiter(this, void 0, void 0, function* () {
            let queries = sql.split(";")
                .map(query => query.replace(/^[\n]+/, "").replace(/[\n]+$/, ""))
                .filter(part => !!part);
            let queriesValues = [];
            for (let query of queries) {
                let values = {};
                for (let ref of (query.match(/\$[0-9]+/g) || [])) {
                    values[ref] = valueAlloc.retrieve(ref);
                }
                queriesValues.push(values);
            }
            let results = [];
            for (let query of queries) {
                let values = queriesValues.shift();
                if (logEnable) {
                    console.log("SQL:\n" + query);
                    console.log(values);
                }
                if (!!query.match(/^SELECT/)) {
                    let rows = yield db.all(query, values);
                    if (handleStringEncoding) {
                        connectAndGetApi.decodeOkPacketsStrings(rows);
                    }
                    results.push(rows);
                }
                else {
                    const { insert_id_prev } = yield db.get("SELECT last_insert_rowid() as insert_id_prev");
                    let stmt = (yield db.run(query, values))["stmt"];
                    results.push({
                        "insertId": (insert_id_prev === stmt.lastID) ? 0 : stmt.lastID,
                        "affectedRows": stmt.changes
                    });
                }
            }
            return (results.length === 1) ? results[0] : results;
        }));
        return {
            query,
            esc,
            buildInsertQuery,
            buildInsertOrUpdateQueries,
            buildSetVarQuery,
            buildGetVarQuery
        };
    });
}
exports.connectAndGetApi = connectAndGetApi;
(function (connectAndGetApi) {
    function decodeOkPacketsStrings(rows) {
        for (let row of rows) {
            for (let key in row) {
                if (typeof row[key] === "string") {
                    row[key] = Buffer.from(row[key], "binary").toString("utf8");
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
;
