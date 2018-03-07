"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ZongJi = require("zongji");
const ts_events_extended_1 = require("ts-events-extended");
class MySqlEvents {
    constructor(connectionConfig, cbReady) {
        this.evtNewRow = new ts_events_extended_1.SyncEvent();
        this.evtDeleteRow = new ts_events_extended_1.SyncEvent();
        this.zongji = new ZongJi(connectionConfig);
        for (let key of ["connection", "ctrlConnection"]) {
            this.zongji[key].query("SET SESSION wait_timeout=31536000");
        }
        this.zongji.once("binlog", evt => {
            this.zongji.set({
                "includeEvents": ['tablemap', 'writerows', 'updaterows', 'deleterows']
            });
            this.zongji.on("binlog", evt => this.onBinlog(evt));
            cbReady();
        });
        this.zongji.start({
            "startAtEnd": true,
            "includeEvents": ["rotate"]
        });
    }
    static launch(connectionConfig) {
        return new Promise(resolve => {
            this._instance = new this(connectionConfig, () => resolve(this._instance));
        });
    }
    static get instance() {
        if (!this._instance)
            throw new Error("MySqlEvent not initialized");
        return this._instance;
    }
    onBinlog(evt) {
        let evtRow;
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
MySqlEvents._instance = undefined;
exports.MySqlEvents = MySqlEvents;
