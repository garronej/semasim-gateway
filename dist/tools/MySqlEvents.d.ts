import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
export interface Row {
    database: string;
    table: string;
    row: Record<string, string>;
}
export declare class MySqlEvents {
    private static _instance;
    static launch(connectionConfig: mysql.IConnectionConfig): Promise<MySqlEvents>;
    static readonly instance: MySqlEvents;
    private readonly zongji;
    readonly evtNewRow: SyncEvent<Row>;
    readonly evtDeleteRow: SyncEvent<Row>;
    private constructor();
    private onBinlog(evt);
}
