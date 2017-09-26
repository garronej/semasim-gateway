import * as ZongJi from "zongji";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
import { c } from "../lib/_constants"


export interface Row {
    database: string;
    table: string;
    row: Record<string, string>
}

export class MySqlEvents {

    public static connectionConfig: mysql.IConnectionConfig | undefined;

    private static instance: MySqlEvents | undefined= undefined;

    public static getInstance(): MySqlEvents {

        if( this.instance ) return this.instance;

        if( !this.connectionConfig ) throw new Error("connectionConfig not set");

        this.instance= new this(this.connectionConfig);

        return this.getInstance();

    }

    private readonly zongji;

    public readonly evtNewRow = new SyncEvent<Row>();
    public readonly evtDeleteRow = new SyncEvent<Row>();

    constructor(connectionConfig: mysql.IConnectionConfig) {

        this.zongji = new ZongJi(connectionConfig);

        this.zongji.on("binlog", evt => this.onBinlog(evt));

        this.zongji.start({
            "startAtEnd": true,
            "includeEvents": ['tablemap', 'writerows', 'updaterows', 'deleterows']
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

/*
let config: mysql.IConnectionConfig = {
    ...c.dbParamsGateway,
    "database": "asterisk",
    "multipleStatements": true
};

let mySqlEvents = new MySqlEvents(config);

mySqlEvents.evtNewRow.attach(row => console.log(row));
mySqlEvents.evtDeleteRow.attach(row => console.log(row));

function tracePrototypeChainOf(object) {

    var proto = object.constructor.prototype,
        result = JSON.stringify(Object.getOwnPropertyNames(object)) + '\n';

    while (proto) {
        result += ' -> ' + proto.constructor.name + '\n';
        result += JSON.stringify(Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto)
    }

    return result;
}
*/

