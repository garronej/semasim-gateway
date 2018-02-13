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
