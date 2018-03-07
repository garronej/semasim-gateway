import * as ZongJi from "zongji";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";


export interface Row {
    database: string;
    table: string;
    row: Record<string, string>
}

export class MySqlEvents {

    private static _instance: MySqlEvents | undefined= undefined;

    public static launch(
        connectionConfig: mysql.IConnectionConfig
    ){

        return new Promise<MySqlEvents>(resolve=> {

            this._instance= new this(
                connectionConfig, 
                ()=> resolve(this._instance)
            );

        });

    }

    public static get instance(): MySqlEvents {

        if( !this._instance ) throw new Error("MySqlEvent not initialized");

        return this._instance;

    }

    private readonly zongji;

    public readonly evtNewRow = new SyncEvent<Row>();
    public readonly evtDeleteRow = new SyncEvent<Row>();

    private constructor(
        connectionConfig: mysql.IConnectionConfig,
        cbReady: ()=> void
    ) {

        this.zongji = new ZongJi(connectionConfig);

        for( let key of [ "connection", "ctrlConnection" ]){

            this.zongji[key].query("SET SESSION wait_timeout=31536000");

        }

        this.zongji.once("binlog", evt=> {

            this.zongji.set({ 
                "includeEvents": ['tablemap', 'writerows', 'updaterows', 'deleterows']
            });

            this.zongji.on("binlog", evt => this.onBinlog(evt));

            cbReady();

        });


        this.zongji.start({
            "startAtEnd": true,
            "includeEvents": [ "rotate" ]
        });

    }

    private onBinlog(evt) {

        let evtRow: SyncEvent<Row>;

        switch (evt.getEventName()) {
            case "deleterows":
                evtRow = this.evtDeleteRow;
                break;
            case "writerows":
                evtRow = this.evtNewRow;
                break;
            default: return;
        }

        let { parentSchema, tableName } = evt.tableMap[evt.tableId];

        for (let row of evt.rows)
            evtRow.post({
                "database": parentSchema,
                "table": tableName,
                row
            });

    }

}
