import * as sqlite from "sqlite";
import * as runExclusive from "run-exclusive";

export type TSql = string | number | null;

export type Api= {
    query(sql: string): Promise<any>;
    esc(value: TSql): string;
    buildInsertQuery(
        table: string,
        values: Record<string, TSql>,
        onDuplicateKeyAction: "IGNORE" | "THROW ERROR"
    ): string;
    buildInsertOrUpdateQueries<T extends Record<string, TSql>>(
        table: string,
        values: T,
        table_key: (keyof T)[]
    ): string;
    buildSetVarQuery( 
        varName: string, 
        varType: "integer_value" | "text_value", 
        sql: string
    ): string;
    buildGetVarQuery( 
        varName: string 
    ): string;
};

let logEnable= false;

export function enableLog(){
    console.log("enable sqlite log");
    logEnable= true;
}

export function disableLog(){
    console.log("disable sqlite log");
    logEnable= false;
}

namespace valueAlloc {

    let counter= 0;

    const map= new Map<string, TSql>();

    export function alloc(value: TSql): string {

        if( value === undefined ){

            throw new Error("Alloc 'undefined' which is not a SQL valid type");

        }

        let ref= `\$${counter++}`;

        map.set(ref, value);

        return ref;


    }

    export function retrieve(ref: string): TSql {

        let value= map.get(ref);

        if( value === undefined ){

            throw new Error("sqliteCustom error, value freed");

        }

        process.nextTick(()=> map.delete(ref));

        return value;

    }

}


export async function connectAndGetApi(
    db_path: string,
    handleStringEncoding?: "HANDLE STRING ENCODING"
): Promise<Api> {

    const db= await sqlite.open(db_path, { "promise": Promise });

    await db.get("PRAGMA foreign_keys = ON");

    await db.get("PRAGMA temp_store = 2");

    await db.get("DROP TABLE IF EXISTS _variables");

    await db.get([
        "CREATE TEMP TABLE _variables (",
        "name TEXT PRIMARY KEY,",
        "integer_value INTEGER,",
        "text_value TEXT",
        ")"
    ].join("\n"));

    const buildSetVarQuery: Api["buildSetVarQuery"] = ( varName, varType, sql) => {
        return `INSERT OR REPLACE INTO _variables ( name, ${varType} ) VALUES ( '${varName}', ( ${sql} ) )\n;\n`;
    };

    const buildGetVarQuery: Api["buildGetVarQuery"] = ( varName ) => {
        return `( SELECT coalesce(integer_value, text_value) FROM _variables WHERE name='${varName}' LIMIT 1 )`;
    };

    const esc: Api["esc"] =
        value => {

            if (handleStringEncoding && typeof value === "string") {

                value = Buffer.from(value, "utf8").toString("binary");

            }

            return valueAlloc.alloc(value);

        };

    const buildInsertQuery: Api["buildInsertQuery"] =
        (table, values, onDuplicateKeyAction) => {

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

    const buildInsertOrUpdateQueries: Api["buildInsertOrUpdateQueries"] =
        (table, values, table_key) => {

            let sql = buildInsertQuery(table, values, "IGNORE");

            const _eq = (key: string) => `\`${key}\`=${esc(values[key])}`;

            let not_table_key = Object.keys(values).filter(key => table_key.indexOf(key) < 0);

            let _set = not_table_key.map(_eq).join(", ");

            let _where = [
                ...table_key.map(_eq),
                [
                    "NOT ( ",
                    not_table_key.map(key => (key !== null) ?
                        `( \`${key}\` IS NOT NULL AND ${_eq(key)} )` :
                        `\`${key}\` IS NULL`
                    ).join(" AND "),
                    " ) "
                ].join("")
            ].join(" AND ");

            sql += `UPDATE \`${table}\` SET ${_set} WHERE ${_where}\n;\n`;

            return sql;

        };

    const query: Api["query"] = runExclusive.build(
        async (sql: string) => {

            let queries = sql.split(";")
                .map(query => query.replace(/^[\n]+/, "").replace(/[\n]+$/, ""))
                .filter(part => !!part)
                ;

            let queriesValues: Record<string, TSql>[] = [];

            for (let query of queries) {

                let values: Record<string, TSql> = {};

                for (let ref of (query.match(/\$[0-9]+/g) || [])) {

                    values[ref] = valueAlloc.retrieve(ref);

                }

                queriesValues.push(values);

            }

            let results: any[] = [];

            for (let query of queries) {

                let values = queriesValues.shift();

                if (logEnable) {

                    console.log("SQL:\n" + query);
                    console.log(values);

                }

                if (!!query.match(/^SELECT/)) {

                    let rows = await db.all(query, values);

                    if (handleStringEncoding) {

                        connectAndGetApi.decodeOkPacketsStrings(rows);

                    }

                    results.push(rows);

                } else {

                    const { insert_id_prev } = await db.get(
                        "SELECT last_insert_rowid() as insert_id_prev"
                    );

                    let stmt = (await db.run(query, values))["stmt"];

                    results.push({
                        "insertId": (insert_id_prev === stmt.lastID) ? 0 : stmt.lastID,
                        "affectedRows": stmt.changes
                    });

                }

            }

            return (results.length === 1) ? results[0] : results;

        }
    );

    return {
        query,
        esc,
        buildInsertQuery,
        buildInsertOrUpdateQueries,
        buildSetVarQuery,
        buildGetVarQuery
    };

}

export namespace connectAndGetApi {

    export function decodeOkPacketsStrings(rows: any[]) {

        for (let row of rows) {

            for (let key in row) {

                if (typeof row[key] === "string") {

                    row[key] = Buffer.from(row[key], "binary").toString("utf8");

                }

            }

        }

    }

}

export namespace bool {

    export function enc(b: boolean): 0 | 1;
    export function enc(b: undefined): null;
    export function enc(b: boolean | undefined): 0 | 1 | null;
    export function enc(b: boolean | undefined): 0 | 1 | null {
        return (b === undefined) ? null : (b ? 1 : 0);
    }

    export function dec(t: 0 | 1): boolean;
    export function dec(t: null): undefined;
    export function dec(t: 0 | 1 | null): boolean | undefined;
    export function dec(t: 0 | 1 | null): boolean | undefined {
        return (t === null) ? undefined : (t === 1);
    }

}


export type Response = Response.Rows | Response.Result;

export namespace Response {

    export type Rows = any[];

    export type Result = {
        affectedRows: number;
        insertId: number;
    };

};