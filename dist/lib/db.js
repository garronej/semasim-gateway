"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var mysql = require("mysql");
var sipContact_1 = require("./sipContact");
var f = require("../tools/mySqlFunctions");
var MySqlEvents_1 = require("../tools/MySqlEvents");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_db");
var asterisk;
(function (asterisk) {
    var connectionConfig = __assign({}, _constants_1.c.dbParamsGateway, { "database": "asterisk" });
    function initializeEvt() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MySqlEvents_1.MySqlEvents.initialize(connectionConfig)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.initializeEvt = initializeEvt;
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, connectionConfig, { "multipleStatements": true }));
        }
        return f.queryOnConnection(connection, sql, values);
    }
    asterisk.query = query;
    var evtNewContact = undefined;
    function getEvtNewContact() {
        var _this = this;
        if (evtNewContact)
            return evtNewContact;
        evtNewContact = new ts_events_extended_1.SyncEvent();
        MySqlEvents_1.MySqlEvents.instance.evtNewRow.attach(function (_a) {
            var database = _a.database, table = _a.table;
            return (database === connectionConfig.database &&
                table === "ps_contacts");
        }, function (_a) {
            var row = _a.row;
            return __awaiter(_this, void 0, void 0, function () {
                var id, endpoint, path, uri, user_agent, psContact, contact;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = row.id, endpoint = row.endpoint, path = row.path, uri = row.uri, user_agent = row.user_agent;
                            psContact = { id: id, endpoint: endpoint, path: path, uri: uri, user_agent: user_agent };
                            return [4 /*yield*/, sipContact_1.PsContact.buildContact(psContact)];
                        case 1:
                            contact = _a.sent();
                            evtNewContact.post(contact);
                            return [2 /*return*/];
                    }
                });
            });
        });
        return evtNewContact;
    }
    asterisk.getEvtNewContact = getEvtNewContact;
    var evtExpiredContact = undefined;
    function getEvtExpiredContact() {
        var _this = this;
        if (evtExpiredContact)
            return evtExpiredContact;
        evtExpiredContact = new ts_events_extended_1.SyncEvent();
        MySqlEvents_1.MySqlEvents.instance.evtDeleteRow.attach(function (_a) {
            var database = _a.database, table = _a.table;
            return (database === connectionConfig.database &&
                table === "ps_contacts");
        }, function (_a) {
            var row = _a.row;
            return __awaiter(_this, void 0, void 0, function () {
                var id, endpoint, path, uri, user_agent, psContact, contact;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = row.id, endpoint = row.endpoint, path = row.path, uri = row.uri, user_agent = row.user_agent;
                            psContact = { id: id, endpoint: endpoint, path: path, uri: uri, user_agent: user_agent };
                            return [4 /*yield*/, sipContact_1.PsContact.buildContact(psContact)];
                        case 1:
                            contact = _a.sent();
                            evtExpiredContact.post(contact);
                            return [2 /*return*/];
                    }
                });
            });
        });
        return evtExpiredContact;
    }
    asterisk.getEvtExpiredContact = getEvtExpiredContact;
    function getContacts(endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sql, values, psContacts, contacts, tasks, _loop_1, psContacts_1, psContacts_1_1, psContact, e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = [
                            "SELECT",
                            "ps_contacts.id,",
                            "ps_contacts.uri,",
                            "ps_contacts.path,",
                            "ps_contacts.endpoint,",
                            "ps_contacts.user_agent",
                            "FROM ps_contacts",
                            "INNER JOIN ps_endpoints ON ps_endpoints.id= ps_contacts.endpoint",
                            "WHERE ps_endpoints.id= ? AND ps_endpoints.set_var='ICCID=" + endpoint.sim.iccid + "'"
                        ].join("\n");
                        values = [endpoint.dongle.imei];
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        psContacts = _b.sent();
                        contacts = [];
                        tasks = [];
                        _loop_1 = function (psContact) {
                            tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _b = (_a = contacts).push;
                                        return [4 /*yield*/, sipContact_1.PsContact.buildContact(psContact)];
                                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                                }
                            }); }); })();
                        };
                        try {
                            for (psContacts_1 = __values(psContacts), psContacts_1_1 = psContacts_1.next(); !psContacts_1_1.done; psContacts_1_1 = psContacts_1.next()) {
                                psContact = psContacts_1_1.value;
                                _loop_1(psContact);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (psContacts_1_1 && !psContacts_1_1.done && (_a = psContacts_1.return)) _a.call(psContacts_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, Promise.all(tasks)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, contacts];
                }
            });
        });
    }
    asterisk.getContacts = getContacts;
    /** for test purpose only */
    function flush() {
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = [
                            "DELETE FROM ps_aors;",
                            "DELETE FROM ps_auths;",
                            "DELETE FROM ps_contacts;",
                            "DELETE FROM ps_endpoints;",
                        ].join("\n");
                        return [4 /*yield*/, query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.flush = flush;
    function flushContacts() {
        return __awaiter(this, void 0, void 0, function () {
            var endpoints, contacts, endpoints_1, endpoints_1_1, endpoint, _a, e_2_1, tasks, contacts_1, contacts_1_1, contact, e_2, _b, e_3, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, semasim.getEndpoints()];
                    case 1:
                        endpoints = _d.sent();
                        contacts = [];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 7, 8, 9]);
                        endpoints_1 = __values(endpoints), endpoints_1_1 = endpoints_1.next();
                        _d.label = 3;
                    case 3:
                        if (!!endpoints_1_1.done) return [3 /*break*/, 6];
                        endpoint = endpoints_1_1.value;
                        _a = [contacts];
                        return [4 /*yield*/, getContacts(endpoint)];
                    case 4:
                        contacts = __spread.apply(void 0, _a.concat([(_d.sent())]));
                        _d.label = 5;
                    case 5:
                        endpoints_1_1 = endpoints_1.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_2_1 = _d.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (endpoints_1_1 && !endpoints_1_1.done && (_b = endpoints_1.return)) _b.call(endpoints_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 9:
                        tasks = [];
                        try {
                            for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                                contact = contacts_1_1.value;
                                tasks.push(deleteContact(contact));
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (contacts_1_1 && !contacts_1_1.done && (_c = contacts_1.return)) _c.call(contacts_1);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        return [4 /*yield*/, Promise.all(tasks)];
                    case 10:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.flushContacts = flushContacts;
    function deleteContact(contact) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var timerId = setTimeout(function () { return reject(new Error("Delete contact timeout error")); }, 3000);
            var queryPromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                var affectedRows, isDeleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, query("DELETE FROM ps_contacts WHERE id=?", [contact.id])];
                        case 1:
                            affectedRows = (_a.sent()).affectedRows;
                            isDeleted = affectedRows ? true : false;
                            if (!isDeleted) {
                                getEvtExpiredContact().detach(timerId);
                                clearTimeout(timerId);
                                resolve(false);
                            }
                            return [2 /*return*/];
                    }
                });
            }); })();
            getEvtExpiredContact().attachOnceExtract(function (_a) {
                var id = _a.id;
                return id === contact.id;
            }, timerId, function (deletedContact) { return queryPromise.then(function () {
                clearTimeout(timerId);
                resolve(true);
            }); });
        });
    }
    asterisk.deleteContact = deleteContact;
    function addEndpoint(imei, iccid) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = "";
                        values = [];
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_aors", {
                                "id": imei,
                                "max_contacts": 12,
                                "qualify_frequency": 0,
                                "support_path": "yes"
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var last_four_digits_of_iccid = iccid.substring(iccid.length - 4);
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_auths", {
                                "id": imei,
                                "auth_type": "userpass",
                                "username": imei,
                                "password": last_four_digits_of_iccid,
                                "realm": "semasim"
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_endpoints", {
                                "id": imei,
                                "disallow": "all",
                                "allow": "alaw,ulaw",
                                "context": _constants_1.c.sipCallContext,
                                "message_context": _constants_1.c.sipMessageContext,
                                "subscribe_context": null,
                                "aors": imei,
                                "auth": imei,
                                "force_rport": null,
                                "from_domain": _constants_1.c.shared.domain,
                                "ice_support": "yes",
                                "direct_media": null,
                                "asymmetric_rtp_codec": null,
                                "rtcp_mux": null,
                                "direct_media_method": null,
                                "connected_line_method": null,
                                "transport": "transport-tcp",
                                "callerid_tag": null,
                                "set_var": "ICCID=" + iccid
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.addEndpoint = addEndpoint;
    function getIccidOfEndpoint(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, set_var, iccid;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, query("SELECT set_var FROM ps_endpoints WHERE id=?", [imei])];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent(), 1]), set_var = _a[0].set_var;
                        iccid = set_var.match(/ICCID=([0-9]+)/)[1];
                        return [2 /*return*/, iccid];
                }
            });
        });
    }
    asterisk.getIccidOfEndpoint = getIccidOfEndpoint;
})(asterisk = exports.asterisk || (exports.asterisk = {}));
var semasim;
(function (semasim) {
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, _constants_1.c.dbParamsGateway, { "database": "semasim", "multipleStatements": true }));
        }
        return f.queryOnConnection(connection, sql, values);
    }
    semasim.query = query;
    /** Only for test purpose */
    function flush() {
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = [
                            "DELETE FROM dongle;",
                            "DELETE FROM sim;",
                            "DELETE FROM ua;",
                            "DELETE FROM message_toward_sip;",
                        ].join("\n");
                        return [4 /*yield*/, query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.flush = flush;
    //We do not update is voice enabled
    function addDongle(dongle) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = [
                            "INSERT INTO dongle ( imei, last_connection_date, is_voice_enabled )",
                            "VALUES ( ?, ?, ?)",
                            "ON DUPLICATE KEY UPDATE last_connection_date = VALUES(last_connection_date)"
                        ].join("\n");
                        values = [dongle.imei, Date.now(), null];
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.addDongle = addDongle;
    /** return set of imei => last_connection_date */
    function getDonglesLastConnection() {
        return __awaiter(this, void 0, void 0, function () {
            var sql, rows, out, rows_1, rows_1_1, row, e_4, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = "SELECT imei, last_connection_date FROM dongle";
                        return [4 /*yield*/, query(sql)];
                    case 1:
                        rows = _b.sent();
                        out = new Map();
                        try {
                            for (rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                                row = rows_1_1.value;
                                out.set(row["imei"], new Date(row["last_connection_date"]));
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                        return [2 /*return*/, out];
                }
            });
        });
    }
    semasim.getDonglesLastConnection = getDonglesLastConnection;
    //For claiming the newer the better
    //Add or update is_voice_enabled dongle
    //Add or update sim
    //Add or update endpoint
    function addEndpoint(dongle) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = "";
                        values = [];
                        now = Date.now();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("dongle", {
                                "imei": dongle.imei,
                                "last_connection_date": now,
                                "is_voice_enabled": f.booleanOrUndefinedToSmallIntOrNull(dongle.isVoiceEnabled)
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("sim", {
                                "iccid": dongle.sim.iccid,
                                "imsi": dongle.sim.imsi
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("endpoint", {
                                "dongle_imei": dongle.imei,
                                "sim_iccid": dongle.sim.iccid
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.addEndpoint = addEndpoint;
    function getUas(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, rows, out, rows_2, rows_2_1, row, e_5, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = [
                            "SELECT",
                            "ua.instance,",
                            "ua.push_token,",
                            "ua.software",
                            "FROM ua",
                            "INNER JOIN ua_endpoint ON ua_endpoint.ua_instance= ua.instance",
                            "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
                            "WHERE endpoint.dongle_imei= ?"
                        ].join("\n");
                        values = [imei];
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        rows = _b.sent();
                        out = [];
                        try {
                            for (rows_2 = __values(rows), rows_2_1 = rows_2.next(); !rows_2_1.done; rows_2_1 = rows_2.next()) {
                                row = rows_2_1.value;
                                out[out.length] = {
                                    "instance": row["instance"],
                                    "pushToken": sipContact_1.Contact.UaEndpoint.Ua.PushToken.parse(row["push_token"]),
                                    "software": row["software"]
                                };
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (rows_2_1 && !rows_2_1.done && (_a = rows_2.return)) _a.call(rows_2);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        return [2 /*return*/, out];
                }
            });
        });
    }
    semasim.getUas = getUas;
    /** Used to join asterisk.ps_endpoint and semasim.endpoint, used when building contact */
    function getEndpoint(endpointRef) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, endpoint;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, _getEndpoint(endpointRef)];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent(), 1]), endpoint = _a[0];
                        return [2 /*return*/, endpoint];
                }
            });
        });
    }
    semasim.getEndpoint = getEndpoint;
    function getEndpoints() {
        return _getEndpoint();
    }
    semasim.getEndpoints = getEndpoints;
    function _getEndpoint(endpointRef) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, rows, out, rows_3, rows_3_1, row, e_6, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = [
                            "SELECT",
                            "dongle.imei,",
                            "dongle.is_voice_enabled,",
                            "sim.iccid,",
                            "sim.imsi",
                            "FROM endpoint",
                            "INNER JOIN dongle ON dongle.imei = endpoint.dongle_imei",
                            "INNER JOIN sim ON sim.iccid = endpoint.sim_iccid"
                        ].join("\n");
                        if (endpointRef) {
                            sql += "\n" + "WHERE dongle.imei = ? AND sim.iccid = ?";
                            values = [endpointRef.dongle.imei, endpointRef.sim.iccid];
                        }
                        else {
                            values = [];
                        }
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        rows = _b.sent();
                        out = [];
                        try {
                            for (rows_3 = __values(rows), rows_3_1 = rows_3.next(); !rows_3_1.done; rows_3_1 = rows_3.next()) {
                                row = rows_3_1.value;
                                out[out.length] = {
                                    "dongle": {
                                        "imei": row["imei"],
                                        "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row.is_voice_enabled)
                                    },
                                    "sim": {
                                        "iccid": row["iccid"],
                                        "imsi": row["imsi"]
                                    }
                                };
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (rows_3_1 && !rows_3_1.done && (_a = rows_3.return)) _a.call(rows_3);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        return [2 /*return*/, out];
                }
            });
        });
    }
    //Add or update ua
    //Add or update ua_endpoint
    /** Return true if ua_endpoint entry created */
    function addUaEndpoint(uaEndpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, endpoint_ref, rows, insertId, isNewUa, _a, total;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sql = "";
                        values = [];
                        (function () {
                            var ua = uaEndpoint.ua;
                            var instance = ua.instance, software = ua.software;
                            var _a = __read(f.buildInsertOrUpdateQuery("ua", {
                                instance: instance,
                                software: software,
                                "push_token": sipContact_1.Contact.UaEndpoint.Ua.PushToken.stringify(ua.pushToken)
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        endpoint_ref = "A";
                        sql += [
                            "SELECT @" + endpoint_ref + ":=id_",
                            "FROM endpoint",
                            "WHERE dongle_imei=? AND sim_iccid=?",
                            ";",
                            ""
                        ].join("\n");
                        values = __spread(values, [
                            uaEndpoint.endpoint.dongle.imei,
                            uaEndpoint.endpoint.sim.iccid
                        ]);
                        sql += [
                            "SELECT COUNT(*) as total",
                            "FROM ua_endpoint",
                            "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
                            "WHERE endpoint.dongle_imei= ? AND endpoint.sim_iccid= ?",
                            ";",
                            ""
                        ].join("\n");
                        values = __spread(values, [
                            uaEndpoint.endpoint.dongle.imei,
                            uaEndpoint.endpoint.sim.iccid
                        ]);
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ua_endpoint", {
                                "ua_instance": uaEndpoint.ua.instance,
                                "endpoint": { "@": endpoint_ref }
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        rows = _b.sent();
                        insertId = rows.pop().insertId;
                        isNewUa = insertId !== 0;
                        if (!isNewUa) {
                            return [2 /*return*/, {
                                    isNewUa: isNewUa,
                                    "isFirstUaEndpointOfEndpoint": false
                                }];
                        }
                        _a = __read(rows.pop(), 1), total = _a[0].total;
                        return [2 /*return*/, {
                                isNewUa: isNewUa,
                                "isFirstUaEndpointOfEndpoint": total === 0
                            }];
                }
            });
        });
    }
    semasim.addUaEndpoint = addUaEndpoint;
    ;
    var MessageTowardGsm;
    (function (MessageTowardGsm) {
        function add(to_number, text, uaEndpoint) {
            return __awaiter(this, void 0, void 0, function () {
                var sql, values, ua_endpoint_ref;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sql = "";
                            values = [];
                            ua_endpoint_ref = "A";
                            sql += [
                                "SELECT @" + ua_endpoint_ref + ":= ua_endpoint.id_",
                                "FROM ua_endpoint",
                                "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
                                "WHERE ua_endpoint.ua_instance=? AND endpoint.dongle_imei=? AND endpoint.sim_iccid=?",
                                ";",
                                ""
                            ].join("\n");
                            values = __spread(values, [
                                uaEndpoint.ua.instance,
                                uaEndpoint.endpoint.dongle.imei,
                                uaEndpoint.endpoint.sim.iccid
                            ]);
                            (function () {
                                var _a = __read(f.buildInsertOrUpdateQuery("message_toward_gsm", {
                                    "date": Date.now(),
                                    "ua_endpoint": { "@": ua_endpoint_ref },
                                    "to_number": to_number,
                                    "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                                    "send_date": null
                                }), 2), _sql = _a[0], _values = _a[1];
                                sql += _sql;
                                values = __spread(values, _values);
                            })();
                            return [4 /*yield*/, query(sql, values)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        MessageTowardGsm.add = add;
        function getUnsent(endpoint) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                var sql, values, rows, out, _loop_2, rows_4, rows_4_1, row, e_7, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            sql = [
                                "SELECT",
                                "message_toward_gsm.id_,",
                                "message_toward_gsm.date,",
                                "message_toward_gsm.to_number,",
                                "message_toward_gsm.base64_text,",
                                "ua.instance,",
                                "ua.push_token,",
                                "ua.software,",
                                "dongle.imei,",
                                "dongle.is_voice_enabled,",
                                "sim.iccid,",
                                "sim.imsi",
                                "FROM message_toward_gsm",
                                "INNER JOIN ua_endpoint ON ua_endpoint.id_ = message_toward_gsm.ua_endpoint",
                                "INNER JOIN ua ON ua.instance = ua_endpoint.ua_instance",
                                "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
                                "INNER JOIN dongle ON dongle.imei = endpoint.dongle_imei",
                                "INNER JOIN sim ON sim.iccid = endpoint.sim_iccid",
                                "WHERE dongle.imei=? AND sim.iccid=? AND message_toward_gsm.send_date IS NULL",
                                "ORDER BY message_toward_gsm.date",
                                ";"
                            ].join("\n");
                            values = [
                                endpoint.dongle.imei,
                                endpoint.sim.iccid
                            ];
                            return [4 /*yield*/, query(sql, values)];
                        case 1:
                            rows = _b.sent();
                            out = [];
                            _loop_2 = function (row) {
                                var message = {
                                    "date": new Date(row["date"]),
                                    "uaEndpoint": {
                                        "endpoint": {
                                            "dongle": {
                                                "imei": row["imei"],
                                                "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"])
                                            },
                                            "sim": {
                                                "iccid": row["iccid"],
                                                "imsi": row["imsi"]
                                            }
                                        },
                                        "ua": {
                                            "instance": row["instance"],
                                            "pushToken": sipContact_1.Contact.UaEndpoint.Ua.PushToken.parse(row["push_token"]),
                                            "software": row["software"]
                                        }
                                    },
                                    "to_number": row["to_number"],
                                    "text": (new Buffer(row["base64_text"], "base64")).toString("utf8")
                                };
                                var message_toward_gsm_id_ = row["id_"];
                                var confirm = {
                                    "setSent": function (sentDate) { return __awaiter(_this, void 0, void 0, function () {
                                        var _a, sql, values;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    _a = __read(f.buildInsertOrUpdateQuery("message_toward_gsm", {
                                                        "id_": message_toward_gsm_id_,
                                                        "send_date": sentDate ? sentDate.getTime() : -1
                                                    }), 2), sql = _a[0], values = _a[1];
                                                    return [4 /*yield*/, query(sql, values)];
                                                case 1:
                                                    _b.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); },
                                    "setStatusReport": function (statusReport) { return __awaiter(_this, void 0, void 0, function () {
                                        var _a, sql, values;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    _a = __read(f.buildInsertOrUpdateQuery("message_toward_gsm_status_report", {
                                                        "message_toward_gsm": message_toward_gsm_id_,
                                                        "is_delivered": statusReport.isDelivered ? 1 : 0,
                                                        "discharge_date": isNaN(statusReport.dischargeDate.getTime()) ? null : statusReport.dischargeDate.getTime(),
                                                        "status": statusReport.status
                                                    }), 2), sql = _a[0], values = _a[1];
                                                    return [4 /*yield*/, query(sql, values)];
                                                case 1:
                                                    _b.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); }
                                };
                                out.push([message, confirm]);
                            };
                            try {
                                for (rows_4 = __values(rows), rows_4_1 = rows_4.next(); !rows_4_1.done; rows_4_1 = rows_4.next()) {
                                    row = rows_4_1.value;
                                    _loop_2(row);
                                }
                            }
                            catch (e_7_1) { e_7 = { error: e_7_1 }; }
                            finally {
                                try {
                                    if (rows_4_1 && !rows_4_1.done && (_a = rows_4.return)) _a.call(rows_4);
                                }
                                finally { if (e_7) throw e_7.error; }
                            }
                            return [2 /*return*/, out];
                    }
                });
            });
        }
        MessageTowardGsm.getUnsent = getUnsent;
    })(MessageTowardGsm = semasim.MessageTowardGsm || (semasim.MessageTowardGsm = {}));
    function lastGsmMessageReceived(endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, _a, _b, count, r2, _c, time;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sql = [
                            "SELECT COUNT(*) AS count",
                            "FROM ua_endpoint",
                            "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
                            "WHERE endpoint.dongle_imei=? AND endpoint.sim_iccid=?",
                            ";",
                            "SELECT MAX(message_toward_sip.date) as time",
                            "FROM message_toward_sip",
                            "INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip=message_toward_sip.id_",
                            "INNER JOIN ua_endpoint ON ua_endpoint.id_ = ua_endpoint_message_toward_sip.ua_endpoint",
                            "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
                            "WHERE message_toward_sip.is_report=0 AND endpoint.dongle_imei =? AND endpoint.sim_iccid= ?"
                        ].join("\n");
                        values = [
                            endpoint.dongle.imei,
                            endpoint.sim.iccid
                        ];
                        values = __spread(values, values);
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _a = __read.apply(void 0, [_d.sent(), 2]), _b = __read(_a[0], 1), count = _b[0].count, r2 = _a[1];
                        if (!count) {
                            return [2 /*return*/, undefined];
                        }
                        else {
                            _c = __read(r2, 1), time = _c[0].time;
                            if (time === null) {
                                return [2 /*return*/, new Date(0)];
                            }
                            else {
                                return [2 /*return*/, new Date(time)];
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.lastGsmMessageReceived = lastGsmMessageReceived;
    var MessageTowardSip;
    (function (MessageTowardSip) {
        function add(from_number, text, date, is_report, target) {
            return __awaiter(this, void 0, void 0, function () {
                var sql_, values_, sql, values;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sql_ = [
                                "FROM ua_endpoint",
                                "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
                                "WHERE endpoint.dongle_imei= ? AND endpoint.sim_iccid= ?"
                            ].join("\n");
                            values_ = [];
                            switch (target.is) {
                                case "ALL UA_ENDPOINT OF ENDPOINT":
                                    values_ = [
                                        target.endpoint.dongle.imei,
                                        target.endpoint.sim.iccid
                                    ];
                                    break;
                                case "UA_ENDPOINT":
                                    sql_ += "\n" + "AND ua_endpoint.ua_instance = ?";
                                    values_ = [
                                        target.uaEndpoint.endpoint.dongle.imei,
                                        target.uaEndpoint.endpoint.sim.iccid,
                                        target.uaEndpoint.ua.instance
                                    ];
                                    break;
                                case "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA":
                                    sql_ += "\n" + "AND ua_endpoint.ua_instance <> ?";
                                    values_ = [
                                        target.endpoint.dongle.imei,
                                        target.endpoint.sim.iccid,
                                        target.excludeUa.instance
                                    ];
                                    break;
                            }
                            sql = [
                                "INSERT INTO message_toward_sip ( is_report, date, from_number, base64_text )",
                                "SELECT ?, ?, ?, ?",
                                sql_,
                                "HAVING COUNT(*) <> 0",
                                ";",
                                ""
                            ].join("\n");
                            values = __spread([
                                f.booleanOrUndefinedToSmallIntOrNull(is_report),
                                date.getTime(),
                                from_number,
                                (new Buffer(text, "utf8")).toString("base64")
                            ], values_);
                            sql += [
                                "INSERT INTO ua_endpoint_message_toward_sip",
                                "( ua_endpoint, message_toward_sip, delivered_date )",
                                "SELECT ua_endpoint.id_, LAST_INSERT_ID(), NULL",
                                sql_
                            ].join("\n");
                            values = __spread(values, values_);
                            return [4 /*yield*/, query(sql, values)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        MessageTowardSip.add = add;
        function unsentCount(uaEndpoint) {
            return __awaiter(this, void 0, void 0, function () {
                var sql, values;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sql = [
                                "SELECT COUNT(*) AS count",
                                "FROM message_toward_sip",
                                "INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip= message_toward_sip.id_",
                                "INNER JOIN ua_endpoint ON ua_endpoint.id_= ua_endpoint_message_toward_sip.ua_endpoint",
                                "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
                                "WHERE ua_endpoint_message_toward_sip.delivered_date IS NULL",
                                "AND ua_endpoint.ua_instance=?",
                                "AND endpoint.dongle_imei=?",
                                "AND endpoint.sim_iccid=?"
                            ].join("\n");
                            values = [
                                uaEndpoint.ua.instance,
                                uaEndpoint.endpoint.dongle.imei,
                                uaEndpoint.endpoint.sim.iccid
                            ];
                            return [4 /*yield*/, query(sql, values)];
                        case 1: return [2 /*return*/, (_a.sent())[0]["count"]];
                    }
                });
            });
        }
        MessageTowardSip.unsentCount = unsentCount;
        function getUnsent(uaEndpoint) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                var sql, values, rows, out, _loop_3, rows_5, rows_5_1, row, e_8, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            sql = [
                                "SELECT",
                                "message_toward_sip.is_report,",
                                "message_toward_sip.date,",
                                "message_toward_sip.from_number,",
                                "message_toward_sip.base64_text,",
                                "ua_endpoint_message_toward_sip.id_",
                                "FROM message_toward_sip",
                                "INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip= message_toward_sip.id_",
                                "INNER JOIN ua_endpoint ON ua_endpoint.id_= ua_endpoint_message_toward_sip.ua_endpoint",
                                "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
                                "WHERE ua_endpoint_message_toward_sip.delivered_date IS NULL",
                                "AND ua_endpoint.ua_instance=?",
                                "AND endpoint.dongle_imei=?",
                                "AND endpoint.sim_iccid=?",
                                "ORDER BY message_toward_sip.date"
                            ].join("\n");
                            values = [
                                uaEndpoint.ua.instance,
                                uaEndpoint.endpoint.dongle.imei,
                                uaEndpoint.endpoint.sim.iccid
                            ];
                            return [4 /*yield*/, query(sql, values)];
                        case 1:
                            rows = _b.sent();
                            out = new Array();
                            _loop_3 = function (row) {
                                var message = {
                                    "date": new Date(row["date"]),
                                    "from_number": row["from_number"],
                                    "isReport": row["is_report"] === 1,
                                    "text": (new Buffer(row["base64_text"], "base64")).toString("utf8"),
                                };
                                var setReceived = function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a, sql, values;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _a = __read(f.buildInsertOrUpdateQuery("ua_endpoint_message_toward_sip", {
                                                    "id_": row["id_"],
                                                    "delivered_date": Date.now()
                                                }), 2), sql = _a[0], values = _a[1];
                                                return [4 /*yield*/, query(sql, values)];
                                            case 1:
                                                _b.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); };
                                out.push([message, setReceived]);
                            };
                            try {
                                for (rows_5 = __values(rows), rows_5_1 = rows_5.next(); !rows_5_1.done; rows_5_1 = rows_5.next()) {
                                    row = rows_5_1.value;
                                    _loop_3(row);
                                }
                            }
                            catch (e_8_1) { e_8 = { error: e_8_1 }; }
                            finally {
                                try {
                                    if (rows_5_1 && !rows_5_1.done && (_a = rows_5.return)) _a.call(rows_5);
                                }
                                finally { if (e_8) throw e_8.error; }
                            }
                            return [2 /*return*/, out];
                    }
                });
            });
        }
        MessageTowardSip.getUnsent = getUnsent;
    })(MessageTowardSip = semasim.MessageTowardSip || (semasim.MessageTowardSip = {}));
})(semasim = exports.semasim || (exports.semasim = {}));
