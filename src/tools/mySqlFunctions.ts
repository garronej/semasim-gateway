import * as mysql from "mysql";

import * as _debug from "debug";
let debug = _debug("_dbInterface");

export type TSql= string | number | null;

export function esc(value: TSql): string{
    return mysql.escape(value);
}

export function buildQueryFunction(connectionConfig: mysql.IConnectionConfig) {

    connectionConfig = {
        ...connectionConfig,
        "multipleStatements": true
    };

    let connection: mysql.IConnection | undefined = undefined;

    return function query(sql: string, values?: TSql[]) {

        return new Promise<any>((resolve, reject) => {

            if (!connection) {

                connection = mysql.createConnection(connectionConfig);

                query(
                    [
                        "SET SESSION wait_timeout=31536000;                             ",
                        "DROP FUNCTION IF EXISTS _ASSERT;                               ",
                        "CREATE FUNCTION _ASSERT(bool INTEGER, message VARCHAR(256))    ",
                        "   RETURNS INTEGER DETERMINISTIC                               ",
                        "BEGIN                                                          ",
                        "    IF bool IS NULL OR bool = 0 THEN                           ",
                        "        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;    ",
                        "    END IF;                                                    ",
                        "    RETURN bool;                                               ",
                        "END;                                                           "
                    ].join("\n")
                );

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

export function buildQueryFunctionSafe(
    connectionConfig: mysql.IConnectionConfig
) {

    let poolConfig: mysql.IPoolConfig = {
        ...connectionConfig,
        "connectionLimit": 1,
        "multipleStatements": true
    };

    let pool: mysql.IPool | undefined = undefined;

    return function query(
        sql: string,
        values?: TSql[]
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

export function buildInsertQuery(
    table: string,
    obj: Record<string, TSql | { "@": string; }>,
    onDuplicateKey: "IGNORE" | "UPDATE" | "THROW ERROR"
): string {

    let keys = Object.keys(obj);
    let values = keys.map(key => obj[key]);

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

export function smallIntOrNullToBooleanOrUndefined(v: 0 | 1 | null): boolean | undefined {
    return (typeof v === "number") ? (v === 1) : undefined;
}

export function booleanOrUndefinedToSmallIntOrNull(v: boolean | undefined): 0 | 1 | null {
    return (typeof v === "boolean") ? (v ? 1 : 0) : null;
}

//TODO: export in mySqlFunctions
export const b64 = {
    "dec": (b64Str: string | null): string | undefined =>
        b64Str === null ? undefined : (new Buffer(b64Str, "base64")).toString("utf8"),
    "enc": (str: string | undefined): string | null =>
        str === undefined ? null : (new Buffer(str, "utf8")).toString("base64")
};


export function assertSame<T>(
    o1: T, o2: T, errorMessage: string = "assertSame error"
) {

    try {
        assertSame_(o1, o2, true);
    } catch(e){
        let error = new Error(`${errorMessage} (${e.message})`);
        error["o1"] = o1;
        error["o2"] = o2;
        throw error;
    }

}

function assertSame_<T>( 
    o1: T, 
    o2: T, 
    handleArrayAsSet: boolean = true
) {

    if (o1 instanceof Object) {

        console.assert(o2 instanceof Object, "M1");

        if (handleArrayAsSet && o1 instanceof Array) {

            if( !(o2 instanceof Array)){
                console.assert(false, "M2");
                return;
            }

            console.assert(o1.length === o2.length, "M3");

            let o2Set = new Set(o2);

            for (let val1 of o1) {

                let isFound = false;

                for (let val2 of o2Set) {

                    try {
                        assertSame_(val1, val2, handleArrayAsSet)
                    } catch{
                        continue;
                    }

                    isFound = true;
                    o2Set.delete(val2);
                    break;

                }

                console.assert(isFound, "M4");

            }

        } else {

            if (o1 instanceof Array) {

                if (!(o2 instanceof Array)) throw new Error();

                console.assert(o1.length === o2.length, "M5");

            } else {

                assertSame_(Object.keys(o1), Object.keys(o2));

            }

            for (let key in o1) {
                assertSame_(o1[key], o2[key], handleArrayAsSet);
            }

        }

    } else {

        console.assert(o1 === o2, `M7, ${o1} !== ${o2}`);

    }

}

export const genDigits = (n: number): string =>
    (new Array(n))
        .fill("")
        .map(() => `${~~(Math.random() * 10)}`)
        .join("")
    ;

export const genHexStr = (n: number) => (new Array(n))
    .fill("")
    .map(() => (~~(Math.random() * 0x10)).toString(16))
    .join("")
    ;

export const genUtf8Str = (max: number): string => {

    let n = ~~(Math.random() * max);

    n = n ? n : n + 1;

    let arrCode = (new Array(n)).fill(NaN).map(() => ~~(Math.random() * (65535 + 1)));

    let str = arrCode.map(code => String.fromCharCode(code)).join("");

    str = (new Buffer(str, "utf8")).toString("utf8");

    return str;

};