import * as mysql from "mysql";
export declare type TSql = string | number | null;
export declare function esc(value: TSql): string;
export declare function buildQueryFunction(connectionConfig: mysql.IConnectionConfig): (sql: string, values?: TSql[] | undefined) => Promise<any>;
export declare function buildQueryFunctionSafe(connectionConfig: mysql.IConnectionConfig): (sql: string, values?: TSql[] | undefined) => Promise<any>;
export declare function buildInsertQuery(table: string, obj: Record<string, TSql | {
    "@": string;
}>, onDuplicateKey: "IGNORE" | "UPDATE" | "THROW ERROR"): string;
export declare function smallIntOrNullToBooleanOrUndefined(v: 0 | 1 | null): boolean | undefined;
export declare function booleanOrUndefinedToSmallIntOrNull(v: boolean | undefined): 0 | 1 | null;
export declare const b64: {
    "dec": (b64Str: string | null) => string | undefined;
    "enc": (str: string | undefined) => string | null;
};
export declare function assertSame<T>(o1: T, o2: T, errorMessage?: string): void;
export declare const genDigits: (n: number) => string;
export declare const genHexStr: (n: number) => string;
export declare const genUtf8Str: (max: number) => string;
