import * as mysql from "mysql";
export declare type TSql = string | number | null;
export declare function getUtils(connectionConfig: mysql.IConnectionConfig, handleStringEncoding?: "HANDLE STRING ENCODING"): {
    query: (sql: string) => Promise<any>;
    esc: (value: TSql) => string;
    buildInsertQuery: (table: string, obj: Record<string, string | number | {
        "@": string;
    } | null>, onDuplicateKey: "IGNORE" | "UPDATE" | "THROW ERROR") => string;
};
export declare namespace getUtils {
    function decodeOkPacketsStrings(rows: any[]): void;
}
export declare namespace bool {
    function enc(b: boolean): 0 | 1;
    function enc(b: undefined): null;
    function enc(b: boolean | undefined): 0 | 1 | null;
    function dec(t: 0 | 1): boolean;
    function dec(t: null): undefined;
    function dec(t: 0 | 1 | null): boolean | undefined;
}
export declare function assertSame<T>(o1: T, o2: T, errorMessage?: string): void;
export declare namespace assertSame {
    function perform<T>(o1: T, o2: T, handleArrayAsSet?: boolean): void;
}
export declare const genDigits: (n: number) => string;
export declare const genHexStr: (n: number) => string;
export declare function genUtf8Str(length: number, restrict?: "ONLY 4 BYTE CHAR" | "ONLY 1 BYTE CHAR"): string;
export declare namespace genUtf8Str {
    /** return a random utf8 char that fit on one byte */
    function genUtf8Char1B(): string;
    const genUtf8Char2B: () => any;
    function genUtf8Char3B(rand?: number): string;
    function genUtf8Char4B(rand?: number): string;
    function genUtf8Char(): string;
}
