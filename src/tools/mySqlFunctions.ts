import * as mysql from "mysql";

export type TSql = string | number | null;

export function getUtils(
    connectionConfig: mysql.IConnectionConfig,
    handleStringEncoding?: "HANDLE STRING ENCODING"
) {

    connectionConfig = {
        ...connectionConfig,
        "multipleStatements": true
    };

    let esc = (value: TSql): string => {

        if (handleStringEncoding && typeof value === "string") {

            value = Buffer.from(value, "utf8").toString("binary");

        }

        return mysql.escape(value);

    };

    let buildInsertQuery = function (
        table: string,
        obj: Record<string, TSql | { "@": string; }>,
        onDuplicateKey: "IGNORE" | "UPDATE" | "THROW ERROR"
    ): string {

        let keys = Object.keys(obj);

        let backtickKeys = keys.map(key => "`" + key + "`");

        let sqlLinesArray = [
            `INSERT ${(onDuplicateKey === "IGNORE") ? "IGNORE " : ""}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
            `VALUES ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]!["@"] + "`") : esc(obj[key] as TSql)).join(", ")})`
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

    }

    let connection: mysql.IConnection | undefined = undefined;

    let query = (sql: string) => new Promise<any>(
        (resolve, reject) => {

            if (!connection) {

                connection = mysql.createConnection(connectionConfig);

                query(
                    [
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
                    ].join("\n")
                );

            }

            connection.query(sql, (error, results) => {

                if (error) {
                    reject(error);
                    return;
                }

                if (handleStringEncoding && (results instanceof Array) && results.length) {

                    if (Object.getPrototypeOf(results[0]).constructor.name === "RowDataPacket") {

                        getUtils.decodeOkPacketsStrings(results);

                    } else {

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

        }
    );

    return { query, esc, buildInsertQuery };

}

export namespace getUtils {

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
