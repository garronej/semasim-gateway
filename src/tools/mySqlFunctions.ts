import * as mysql from "mysql";

import * as _debug from "debug";
let debug = _debug("_dbInterface");


export function buildQueryFunction(connectionConfig: mysql.IConnectionConfig) {

    connectionConfig = {
        ...connectionConfig,
        "multipleStatements": true
    };

    let connection: mysql.IConnection | undefined = undefined;

    return function query(
        sql: string,
        values?: (string | number | null)[]
    ) {

        return new Promise<any>((resolve, reject) => {

            if (!connection) {

                connection = mysql.createConnection(connectionConfig);

                query("SET SESSION wait_timeout=31536000");

            }

            connection.query(sql, values || [],
                (error, results) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(results);

                }
            );

        });

    };

}

export function buildQueryFunctionSafe(connectionConfig: mysql.IConnectionConfig) {

    let poolConfig: mysql.IPoolConfig = {
        ...connectionConfig,
        "connectionLimit": 1,
        "multipleStatements": true
    };

    let pool: mysql.IPool | undefined = undefined;

    return function query(
        sql: string,
        values?: (string | number | null)[]
    ) {

        return new Promise<any>((resolve, reject) => {

            if (!pool) {

                pool = mysql.createPool(poolConfig);

                setInterval(() => query("SELECT 1"), 14400000);

            }

            pool.getConnection(
                (error, connection) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    connection.query(sql, values || [],
                        (error, results) => {

                            if (error) {
                                reject(error);
                                return;
                            }

                            connection.release();

                            resolve(results);

                        }
                    );

                }
            );

        });

    };

}


export function buildInsertOrUpdateQuery(
    table: string,
    values: Record<string, string | number | null | { "@": string; }>
): [string, (string | number | null)[]] {
    return __buildInsertQuery__(table, values, true);
}

export function buildInsertQuery(
    table: string,
    values: Record<string, string | number | null | { "@": string; }>
): [string, (string | number | null)[]] {
    return __buildInsertQuery__(table, values, false);
}

function __buildInsertQuery__(
    table: string,
    obj: Record<string, string | number | null | { "@": string; }>,
    update: boolean
): [string, (string | number | null)[]] {

    let keys = Object.keys(obj);
    let values = keys.map(key => obj[key]);

    let backtickKeys = keys.map(key => "`" + key + "`");

    let sqlLinesArray = [
        `INSERT INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
        `VALUES ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]!["@"] + "`") : "?").join(", ")})`
    ];

    if (update)
        sqlLinesArray = [
            ...sqlLinesArray,
            "ON DUPLICATE KEY UPDATE",
            backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", ")
        ];

    sqlLinesArray[sqlLinesArray.length] = ";\n";

    return [
        sqlLinesArray.join("\n"),
        keys.filter(key => !(obj[key] instanceof Object)).map(key => (obj[key] as string | number | null))
    ];

}

export function smallIntOrNullToBooleanOrUndefined(v: 0 | 1 | null): boolean | undefined {
    return (typeof v === "number") ? (v === 1) : undefined;
}

export function booleanOrUndefinedToSmallIntOrNull(v: boolean | undefined): 0 | 1 | null {
    return (typeof v === "boolean") ? (v ? 1 : 0) : null;
}
