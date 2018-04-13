export declare type TSql = string | number | null;
export declare type Api = {
    query(sql: string): Promise<any>;
    esc(value: TSql): string;
    buildInsertQuery(table: string, obj: Record<string, TSql>, onDuplicateKeyAction: "IGNORE" | "REPLACE" | "THROW ERROR"): string;
};
export declare function connectAndGetApi(db_path: string, handleStringEncoding?: "HANDLE STRING ENCODING"): Promise<Api>;
export declare namespace connectAndGetApi {
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
