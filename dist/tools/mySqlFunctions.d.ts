import * as mysql from "mysql";
export declare function buildQueryFunction(connectionConfig: mysql.IConnectionConfig): (sql: string, values?: (string | number | null)[] | undefined) => Promise<any>;
export declare function buildQueryFunctionSafe(connectionConfig: mysql.IConnectionConfig): (sql: string, values?: (string | number | null)[] | undefined) => Promise<any>;
export declare function buildInsertOrUpdateQuery(table: string, values: Record<string, string | number | null | {
    "@": string;
}>): [string, (string | number | null)[]];
export declare function buildInsertQuery(table: string, values: Record<string, string | number | null | {
    "@": string;
}>): [string, (string | number | null)[]];
export declare function smallIntOrNullToBooleanOrUndefined(v: 0 | 1 | null): boolean | undefined;
export declare function booleanOrUndefinedToSmallIntOrNull(v: boolean | undefined): 0 | 1 | null;
