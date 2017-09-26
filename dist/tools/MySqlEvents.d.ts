import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
export interface Row {
    database: string;
    table: string;
    row: Record<string, string>;
}
export declare class MySqlEvents {
    static connectionConfig: mysql.IConnectionConfig | undefined;
    private static instance;
    static getInstance(): MySqlEvents;
    private readonly zongji;
    readonly evtNewRow: SyncEvent<Row>;
    readonly evtDeleteRow: SyncEvent<Row>;
    constructor(connectionConfig: mysql.IConnectionConfig);
    private onBinlog(evt);
}
