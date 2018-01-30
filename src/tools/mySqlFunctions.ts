import * as mysql from "mysql";

import * as _debug from "debug";
import { IMySql } from "mysql";
let debug = _debug("_dbInterface");

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

            value = (new Buffer(value, "utf8")).toString("binary");

        }

        return mysql.escape(value);

    };

    let buildInsertQuery = function (
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




export function assertSame<T>(
    o1: T, o2: T, errorMessage: string = "assertSame error"
) {

    try {
        assertSame.perform(o1, o2, true);
    } catch (e) {
        let error = new Error(`${errorMessage} (${e.message})`);
        error["o1"] = o1;
        error["o2"] = o2;
        throw error;
    }

}

export namespace assertSame {

    export function perform<T>(
        o1: T,
        o2: T,
        handleArrayAsSet: boolean = true
    ) {

        if (o1 instanceof Object) {

            console.assert(o2 instanceof Object, "M1");

            if (handleArrayAsSet && o1 instanceof Array) {

                if (!(o2 instanceof Array)) {
                    console.assert(false, "M2");
                    return;
                }

                console.assert(o1.length === o2.length, "M3");

                let o2Set = new Set(o2);

                for (let val1 of o1) {

                    let isFound = false;

                    for (let val2 of o2Set) {

                        try {
                            perform(val1, val2, handleArrayAsSet)
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

                    perform(Object.keys(o1), Object.keys(o2));

                }

                for (let key in o1) {
                    perform(o1[key], o2[key], handleArrayAsSet);
                }

            }

        } else {

            console.assert(o1 === o2, `M7, ${o1} !== ${o2}`);

        }

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


export function genUtf8Str(
    length: number,
    restrict?: "ONLY 4 BYTE CHAR" | "ONLY 1 BYTE CHAR"
): string {

    let charGenerator: () => string;

    switch (restrict) {
        case undefined: charGenerator = genUtf8Str.genUtf8Char; break;
        case "ONLY 1 BYTE CHAR": charGenerator = genUtf8Str.genUtf8Char1B; break;
        case "ONLY 4 BYTE CHAR": charGenerator = genUtf8Str.genUtf8Char4B; break;
    }

    return (new Array(length)).fill("").map(() => charGenerator()).join("");

}

export namespace genUtf8Str {

    /** "11110000" => "f0" */
    function bitStrToHexStr(bin: string): string {

        let hexChars: string[] = [];

        let i = 0;

        while (bin[i] !== undefined) {

            let fourBits = `${bin[i]}${bin[i + 1]}${bin[i + 2]}${bin[i + 3]}`;

            let hexChar = parseInt(fourBits, 2).toString(16);

            hexChars.push(hexChar)

            i = i + 4;

        }

        return hexChars.join("");

    };

    /** 8 => "11010001"  */
    function genBitStr(length: number): string {
        return (new Array(length)).fill("").map(() => `${~~(Math.random() * 2)}`).join("");
    }

    /** throw error if hex does not represent a valid utf8 string */
    function hexStrToUtf8Str(hex: string) {

        let str = (new Buffer(hex, "hex")).toString("utf8");

        if ((new Buffer(str, "utf8")).toString("hex") !== hex) {
            throw new Error("Not valid UTF8 data");
        }

        return str;

    }

    /** return a random utf8 char that fit on one byte */
    export function genUtf8Char1B(): string {

        let bin = `0${genBitStr(7)}`;

        let hex = bitStrToHexStr(bin);

        try {

            return hexStrToUtf8Str(hex);

        } catch{

            return genUtf8Char1B();

        }

    }


    export const genUtf8Char2B = () => {

        let bin = `110${genBitStr(5)}10${genBitStr(6)}`;

        let hex = bitStrToHexStr(bin);

        try {

            return hexStrToUtf8Str(hex);

        } catch{

            return genUtf8Char2B();

        }

    }


    export function genUtf8Char3B(rand?: number): string {

        if (rand === undefined) {
            rand = ~~(Math.random() * 8);
        }

        let bin;

        switch (rand) {
            case 0: bin = `11100000101${genBitStr(5)}10${genBitStr(6)}`; break;
            case 1: bin = `1110000110${genBitStr(6)}10${genBitStr(6)}`; break;
            case 2: bin = `1110001${genBitStr(1)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 3: bin = `111001${genBitStr(2)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 4: bin = `111010${genBitStr(2)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 5: bin = `1110110010${genBitStr(6)}10${genBitStr(6)}`; break;
            case 6: bin = `11101101100${genBitStr(5)}10${genBitStr(6)}`; break;
            case 7: bin = `1110111${genBitStr(1)}10${genBitStr(6)}10${genBitStr(6)}`; break;
        }

        let hex = bitStrToHexStr(bin);

        try {

            return hexStrToUtf8Str(hex);

        } catch{

            return genUtf8Char3B();

        }

    };

    export function genUtf8Char4B(rand?: number): string {

        if (rand === undefined) {
            rand = ~~(Math.random() * 5);
        }

        let bin;

        switch (rand) {
            case 0: bin = `111100001001${genBitStr(4)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 1: bin = `11110000101${genBitStr(5)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 2: bin = `1111000110${genBitStr(6)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 3: bin = `1111001${genBitStr(1)}10${genBitStr(6)}10${genBitStr(6)}10${genBitStr(6)}`; break;
            case 4: bin = `111101001000${genBitStr(4)}10${genBitStr(6)}10${genBitStr(6)}`; break;
        }

        let hex = bitStrToHexStr(bin);

        try {

            return hexStrToUtf8Str(hex);

        } catch{

            return genUtf8Char4B();

        }


    };

    export function genUtf8Char(): string {

        let rand = ~~(Math.random() * 4) as (0 | 1 | 2 | 3);

        switch (rand) {
            case 0: return genUtf8Char1B();
            case 1: return genUtf8Char2B();
            case 2: return genUtf8Char3B();
            case 3: return genUtf8Char4B();
        }

    };


}