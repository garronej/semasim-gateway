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
    function MySqlEvents(connectionConfig, cbReady) {
        var _this = this;
        this.evtNewRow = new ts_events_extended_1.SyncEvent();
        this.evtDeleteRow = new ts_events_extended_1.SyncEvent();
        this.zongji = new ZongJi(connectionConfig);
        try {
            for (var _a = __values(["connection", "ctrlConnection"]), _b = _a.next(); !_b.done; _b = _a.next()) {
                var key = _b.value;
                this.zongji[key].query("SET SESSION wait_timeout=31536000");
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.zongji.once("binlog", function (evt) {
            _this.zongji.set({
                "includeEvents": ['tablemap', 'writerows', 'updaterows', 'deleterows']
            });
            _this.zongji.on("binlog", function (evt) { return _this.onBinlog(evt); });
            cbReady();
        });
        this.zongji.start({
            "startAtEnd": true,
            "includeEvents": ["rotate"]
        });
        var e_1, _c;
    }
    MySqlEvents.initialize = function (connectionConfig) {
        var _this = this;
        return new Promise(function (resolve) {
            _this._instance = new _this(connectionConfig, function () { return resolve(_this._instance); });
        });
    };
    Object.defineProperty(MySqlEvents, "instance", {
        get: function () {
            if (!this._instance)
                throw new Error("MySqlEvent not initialized");
            return this._instance;
        },
        enumerable: true,
        configurable: true
    });
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_d = _b.return)) _d.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var e_2, _d;
    };
    MySqlEvents._instance = undefined;
    return MySqlEvents;
}());
exports.MySqlEvents = MySqlEvents;
