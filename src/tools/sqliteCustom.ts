import * as mysql from "mysql";
import * as sqlite from "sqlite";
import * as runExclusive from "run-exclusive";

export type TSql = string | number | null;

export type Api= {
    query(sql: string): Promise<any>;
    esc(value: TSql): string;
    buildInsertQuery(
        table: string,
        obj: Record<string, TSql>,
        onDuplicateKeyAction: "IGNORE" | "REPLACE" | "THROW ERROR"
    ): string;
};

export async function connectAndGetApi(
    db_path: string,
    handleStringEncoding?: "HANDLE STRING ENCODING"
): Promise<Api> {

    const db= await sqlite.open(db_path, { "promise": Promise });

    const esc: Api["esc"] =
        value => {

            if (handleStringEncoding && typeof value === "string") {

                value = Buffer.from(value, "utf8").toString("binary");

            }

            return mysql.escape(value);

        };

    const buildInsertQuery: Api["buildInsertQuery"] =
        (table, obj, onDuplicateKeyAction) => {

            let keys = Object.keys(obj);

            let backtickKeys = keys.map(key => "`" + key + "`");

            let onDuplicate= (()=>{

                switch(onDuplicateKeyAction){
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


    const query: Api["query"] = runExclusive.build(
        async (sql: string) => {

            let queries = sql.split(";")
                .filter(part => !!part)
                .map(query => query.replace("\n", ""))
                ;

            let results: any[] = [];

            for (let query of queries) {

                if (!!query.match(/^SELECT/)) {

                    let rows = await db.all(query);

                    if (handleStringEncoding) {

                        connectAndGetApi.decodeOkPacketsStrings(rows);

                    }

                    results.push(rows);

                } else {

                    results.push((await db.run(query))["stmt"]);

                }

            }

            return (results.length === 1) ? results[0] : results;

        }
    );

    return { query, esc, buildInsertQuery };

}

export namespace connectAndGetApi {

    export function decodeOkPacketsStrings(rows: any[]) {

        for (let row of rows) {

            for (let key in row) {

                if (typeof row[key] === "string") {

                    row[key] = (new Buffer(row[key], "binary")).toString("utf8");

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
