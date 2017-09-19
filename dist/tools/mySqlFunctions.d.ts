import * as mysql from "mysql";
export declare function queryOnConnection(connection: mysql.IConnection, sql: string, values?: (string | number | null)[]): Promise<any>;
export declare function buildInsertOrUpdateQuery(table: string, values: Record<string, string | number | null | {
    "@": string;
}>): [string, (string | number | null)[]];
export declare function buildInsertQuery(table: string, values: Record<string, string | number | null | {
    "@": string;
}>): [string, (string | number | null)[]];
