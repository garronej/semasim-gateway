"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ZongJi = require("zongji");
var ts_events_extended_1 = require("ts-events-extended");
var MySqlEvents = /** @class */ (function () {
    function MySqlEvents(connectionConfig) {
        var _this = this;
        this.evtNewRow = new ts_events_extended_1.SyncEvent();
        this.evtDeleteRow = new ts_events_extended_1.SyncEvent();
        this.zongji = new ZongJi(connectionConfig);
        this.zongji.on("binlog", function (evt) { return _this.onBinlog(evt); });
        this.zongji.start({
            "startAtEnd": true,
            "includeEvents": ['tablemap', 'writerows', 'updaterows', 'deleterows']
        });
    }
    MySqlEvents.getInstance = function () {
        if (this.instance)
            return this.instance;
        if (!this.connectionConfig)
            throw new Error("connectionConfig not set");
        this.instance = new this(this.connectionConfig);
        return this.getInstance();
    };
    MySqlEvents.prototype.onBinlog = function (evt) {
        var evtRow;
        switch (evt.getEventName()) {
            case "deleterows":
                evtRow = this.evtDeleteRow;
                break;
            case "writerows":
                evtRow = this.evtNewRow;
                break;
            default: return;
        }
        var _a = evt.tableMap[evt.tableId], parentSchema = _a.parentSchema, tableName = _a.tableName;
        try {
            for (var _b = __values(evt.rows), _c = _b.next(); !_c.done; _c = _b.next()) {
                var row = _c.value;
                evtRow.post({
                    "database": parentSchema,
                    "table": tableName,
                    row: row
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_d = _b.return)) _d.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _d;
    };
    MySqlEvents.instance = undefined;
    return MySqlEvents;
}());
exports.MySqlEvents = MySqlEvents;
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
