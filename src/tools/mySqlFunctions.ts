import * as mysql from "mysql";

import * as _debug from "debug";
let debug = _debug("_dbInterface");

export function queryOnConnection(
    connection: mysql.IConnection,
    sql: string,
    values?: (string | number | null)[]
): Promise<any> {

    return new Promise<any>((resolve, reject) => {

        let r = connection.query(
            sql,
            values || [],
            (err, results) => err ? reject(err) : resolve(results)
        );

    });

}


export function buildInsertOrUpdateQuery(
    table: string, 
    values: Record<string, string | number | null>
): [string, (string | number | null)[]]{
    return __buildInsertQuery__(table, values, true);
}

export function buildInsertQuery(
    table: string, 
    values: Record<string, string | number | null>
): [string, (string | number | null)[]]{
    return __buildInsertQuery__(table, values, false);
}

function __buildInsertQuery__(
    table: string,
    values: Record<string, string | number | null>,
    update: boolean
): [string, (string | number | null)[]] {

    let keys = Object.keys(values);

    let backtickKeys = keys.map(key => "`" + key + "`");

    let sqlLinesArray = [
        `INSERT INTO ${table} ( ${backtickKeys.join(", ")} )`,
        `VALUES ( ${keys.map(() => "?").join(", ")} )`
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
        keys.map(key => values[key])
    ];

}
