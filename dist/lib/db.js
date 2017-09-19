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
var runExclusive = require("run-exclusive");
var mysql = require("mysql");
var f = require("../tools/mySqlFunctions");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_dbInterface");
//TODO: manage transactions with async-lock rather than with runExclusive
//do it here but more importantly on backend
var asterisk;
(function (asterisk) {
    var groupRef = runExclusive.createGroupRef();
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, _constants_1.c.dbParamsGateway, { "database": "asterisk", "multipleStatements": true }));
        }
        return f.queryOnConnection(connection, sql, values);
    }
    function queryEndpoints() {
        return __awaiter(this, void 0, void 0, function () {
            var endpoints;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, query("SELECT `id`,`set_var` FROM `ps_endpoints`")];
                    case 1:
                        endpoints = (_a.sent()).map(function (_a) {
                            var id = _a.id;
                            return id;
                        });
                        return [2 /*return*/, endpoints];
                }
            });
        });
    }
    asterisk.queryEndpoints = queryEndpoints;
    function truncateContacts() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, query("TRUNCATE ps_contacts")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.truncateContacts = truncateContacts;
    function queryContacts() {
        return __awaiter(this, void 0, void 0, function () {
            var contacts, contacts_1, contacts_1_1, contact, e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, query("SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM ps_contacts")];
                    case 1:
                        contacts = _b.sent();
                        try {
                            for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                                contact = contacts_1_1.value;
                                contact.uri = contact.uri.replace(/\^3B/g, ";");
                                contact.path = contact.path.replace(/\^3B/g, ";");
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [2 /*return*/, contacts];
                }
            });
        });
    }
    asterisk.queryContacts = queryContacts;
    //TODO: to test
    function queryLastConnectionTimestampOfDonglesEndpoint(endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, _a, set_var, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, query("SELECT `set_var` FROM ps_endpoints WHERE `id`=?", [endpoint])];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent(), 1]), set_var = _a[0].set_var;
                        timestamp = parseInt(set_var.split("=")[1]);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        timestamp = 0;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, timestamp];
                }
            });
        });
    }
    asterisk.queryLastConnectionTimestampOfDonglesEndpoint = queryLastConnectionTimestampOfDonglesEndpoint;
    function deleteContact(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var affectedRows, isDeleted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, query("DELETE FROM `ps_contacts` WHERE `id`=?", [contact.id])];
                    case 1:
                        affectedRows = (_a.sent()).affectedRows;
                        isDeleted = affectedRows ? true : false;
                        return [2 /*return*/, isDeleted];
                }
            });
        });
    }
    asterisk.deleteContact = deleteContact;
    function addOrUpdateEndpoint(endpoint, password) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Add or update endpoint " + endpoint + " in real time configuration");
                        sql = "";
                        values = [];
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_aors", {
                                "id": endpoint,
                                "max_contacts": 12,
                                "qualify_frequency": 0,
                                "support_path": "yes"
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_endpoints", {
                                "id": endpoint,
                                "disallow": "all",
                                "allow": "alaw,ulaw",
                                "context": _constants_1.c.sipCallContext,
                                "message_context": _constants_1.c.sipMessageContext,
                                "subscribe_context": null,
                                "aors": endpoint,
                                "auth": endpoint,
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
                                "set_var": "LAST_CONNECTION_TIMESTAMP=" + Date.now()
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        })();
                        (function () {
                            var _a = __read(f.buildInsertOrUpdateQuery("ps_auths", {
                                "id": endpoint,
                                "auth_type": "userpass",
                                "username": endpoint,
                                "password": password,
                                "realm": "semasim"
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
    asterisk.addOrUpdateEndpoint = addOrUpdateEndpoint;
})(asterisk = exports.asterisk || (exports.asterisk = {}));
var semasim;
(function (semasim) {
    var _this = this;
    var groupRef = runExclusive.createGroupRef();
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, _constants_1.c.dbParamsGateway, { "multipleStatements": true }));
        }
        return f.queryOnConnection(connection, sql, values);
    }
    semasim.addMessageTowardGsm = runExclusive.build(groupRef, function (to_number, text, sender) { return __awaiter(_this, void 0, void 0, function () {
        var sql, values, sim_iccid_ref, ua_instance_id_ref, insertId, message_toward_gsm_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "";
                    values = [];
                    sim_iccid_ref = "A";
                    sql += [
                        "SELECT @" + sim_iccid_ref + ":=dongle.sim_iccid",
                        "FROM dongle",
                        "INNER JOIN sim ON sim.iccid= dongle.sim_iccid",
                        "WHERE dongle.imei= ? ",
                        ";"
                    ].join("\n");
                    values = __spread(values, [sender.dongle_imei]);
                    ua_instance_id_ref = "B";
                    sql += "\n" + [
                        "SELECT @" + ua_instance_id_ref + ":=id",
                        "FROM ua_instance",
                        "WHERE dongle_imei=? AND instance_id=?",
                        ";"
                    ].join("\n");
                    values = __spread(values, [sender.dongle_imei, sender.instance_id]);
                    (function () {
                        var _a = __read(f.buildInsertOrUpdateQuery("message_toward_gsm", {
                            "sim_iccid": { "@": sim_iccid_ref },
                            "date": Date.now(),
                            "ua_instance_id": { "@": ua_instance_id_ref },
                            to_number: to_number,
                            "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                            "sent_message_id": null
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += "\n" + _sql;
                        values = __spread(values, _values);
                    })();
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    insertId = (_a.sent()).pop().insertId;
                    message_toward_gsm_id = insertId;
                    return [2 /*return*/, message_toward_gsm_id];
            }
        });
    }); });
    semasim.setMessageToGsmSentId = runExclusive.build(groupRef, function (message_toward_gsm_id, sent_message_id) { return __awaiter(_this, void 0, void 0, function () {
        var _a, sql, values;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = __read(f.buildInsertOrUpdateQuery("message_toward_gsm", {
                        "id": message_toward_gsm_id,
                        sent_message_id: sent_message_id
                    }), 2), sql = _a[0], values = _a[1];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    semasim.getUnsentMessageOfDongleSim = runExclusive.build(groupRef, function (imei) { return __awaiter(_this, void 0, void 0, function () {
        var queryResult, messages, queryResult_1, queryResult_1_1, line, message, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, query([
                        "SELECT",
                        "message_toward_gsm.id,",
                        "message_toward_gsm.sim_iccid,",
                        "message_toward_gsm.date,",
                        "message_toward_gsm.to_number,",
                        "message_toward_gsm.base64_text,",
                        "ua_instance.instance_id",
                        "FROM message_toward_gsm",
                        "INNER JOIN sim ON sim.iccid= message_toward_gsm.sim_iccid",
                        "INNER JOIN dongle ON dongle.sim_iccid= sim.iccid",
                        "INNER JOIN ua_instance ON ua_instance.id = message_toward_gsm.ua_instance_id",
                        "WHERE dongle.imei= ? AND message_toward_gsm.sent_message_id IS NULL",
                        "ORDER BY message_toward_gsm.date"
                    ].join("\n"), [imei])];
                case 1:
                    queryResult = _b.sent();
                    messages = [];
                    try {
                        for (queryResult_1 = __values(queryResult), queryResult_1_1 = queryResult_1.next(); !queryResult_1_1.done; queryResult_1_1 = queryResult_1.next()) {
                            line = queryResult_1_1.value;
                            message = {
                                "id": line.id,
                                "sim_iccid": line.sim_iccid,
                                "date": new Date(line.date),
                                "sender": {
                                    "dongle_imei": imei,
                                    "instance_id": line.instance_id
                                },
                                "to_number": line.to_number,
                                "text": (new Buffer(line.base64_text, "base64")).toString("utf8")
                            };
                            messages.push(message);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (queryResult_1_1 && !queryResult_1_1.done && (_a = queryResult_1.return)) _a.call(queryResult_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [2 /*return*/, messages];
            }
        });
    }); });
    semasim.getSenderAndTextOfSentMessageToGsm = runExclusive.build(groupRef, function (imei, sent_message_id) { return __awaiter(_this, void 0, void 0, function () {
        var query_result, _a, _b, instance_id, base64_text;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, query([
                        "SELECT",
                        "ua_instance.instance_id,",
                        "message_toward_gsm.base64_text",
                        "FROM message_toward_gsm",
                        "INNER JOIN sim ON sim.iccid= message_toward_gsm.sim_iccid",
                        "INNER JOIN dongle ON dongle.sim_iccid= sim.iccid",
                        "INNER JOIN ua_instance ON ua_instance.id = message_toward_gsm.ua_instance_id",
                        "WHERE dongle.imei= ? AND message_toward_gsm.sent_message_id= ?",
                    ].join("\n"), [imei, sent_message_id])];
                case 1:
                    query_result = _c.sent();
                    if (!query_result.length)
                        return [2 /*return*/, undefined];
                    _a = __read(query_result, 1), _b = _a[0], instance_id = _b.instance_id, base64_text = _b.base64_text;
                    return [2 /*return*/, {
                            "sender": { "dongle_imei": imei, instance_id: instance_id },
                            "text": (new Buffer(base64_text, "base64")).toString("utf8")
                        }];
            }
        });
    }); });
    semasim.addDongleAndSim = runExclusive.build(groupRef, function (imei, iccid) { return __awaiter(_this, void 0, void 0, function () {
        var sql, values;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "";
                    values = [];
                    (function () {
                        var _a = __read(f.buildInsertOrUpdateQuery("sim", { iccid: iccid }), 2), _sql = _a[0], _values = _a[1];
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        var _a = __read(f.buildInsertOrUpdateQuery("dongle", {
                            imei: imei, "sim_iccid": iccid
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
    }); });
    semasim.addUaInstance = runExclusive.build(groupRef, function (uaInstancePk) { return __awaiter(_this, void 0, void 0, function () {
        var dongle_imei, instance_id, _a, sql, values, resp, isNew;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dongle_imei = uaInstancePk.dongle_imei, instance_id = uaInstancePk.instance_id;
                    _a = __read(f.buildInsertOrUpdateQuery("ua_instance", { dongle_imei: dongle_imei, instance_id: instance_id }), 2), sql = _a[0], values = _a[1];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    resp = _b.sent();
                    isNew = resp.insertId !== 0;
                    return [2 /*return*/, isNew];
            }
        });
    }); });
    semasim.addMessageTowardSip = runExclusive.build(groupRef, function (from_number, text, date, target) { return __awaiter(_this, void 0, void 0, function () {
        var ua_instance_ids, imei, _a, dongle_imei, instance_id, _b, dongle_imei, instance_id, _c, id, _d, sim_iccid, message_toward_sip_id, _e, _sql, _values, insertId, sql, values, ua_instance_ids_1, ua_instance_ids_1_1, ua_instance_id, _f, _sql_1, _values_1, e_3, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    if (!target.allUaInstanceOfImei) return [3 /*break*/, 2];
                    imei = target.allUaInstanceOfImei;
                    return [4 /*yield*/, query("SELECT id FROM ua_instance WHERE dongle_imei=?", [imei])];
                case 1:
                    ua_instance_ids = (_h.sent()).map(function (_a) {
                        var id = _a.id;
                        return id;
                    });
                    return [3 /*break*/, 7];
                case 2:
                    if (!target.allUaInstanceOfEndpointOtherThan) return [3 /*break*/, 4];
                    _a = target.allUaInstanceOfEndpointOtherThan, dongle_imei = _a.dongle_imei, instance_id = _a.instance_id;
                    imei = dongle_imei;
                    return [4 /*yield*/, query("SELECT id FROM ua_instance WHERE dongle_imei=? AND instance_id <> ?", [imei, instance_id])];
                case 3:
                    ua_instance_ids = (_h.sent()).map(function (_a) {
                        var id = _a.id;
                        return id;
                    });
                    if (!ua_instance_ids.length)
                        return [2 /*return*/, NaN];
                    return [3 /*break*/, 7];
                case 4:
                    if (!target.uaInstance) return [3 /*break*/, 6];
                    _b = target.uaInstance, dongle_imei = _b.dongle_imei, instance_id = _b.instance_id;
                    imei = dongle_imei;
                    return [4 /*yield*/, query("SELECT id FROM ua_instance WHERE dongle_imei=? AND instance_id= ?", [imei, instance_id])];
                case 5:
                    _c = __read.apply(void 0, [(_h.sent()), 1]), id = _c[0].id;
                    ua_instance_ids = [id];
                    return [3 /*break*/, 7];
                case 6: throw new Error("No target");
                case 7: return [4 /*yield*/, query("SELECT sim_iccid FROM dongle WHERE imei=?", [imei])];
                case 8:
                    _d = __read.apply(void 0, [_h.sent(), 1]), sim_iccid = _d[0].sim_iccid;
                    _e = __read(f.buildInsertOrUpdateQuery("message_toward_sip", {
                        sim_iccid: sim_iccid,
                        "date": date.getTime(),
                        from_number: from_number,
                        "base64_text": (new Buffer(text, "utf8")).toString("base64")
                    }), 2), _sql = _e[0], _values = _e[1];
                    return [4 /*yield*/, query(_sql, _values)];
                case 9:
                    insertId = (_h.sent()).insertId;
                    message_toward_sip_id = insertId;
                    sql = "";
                    values = [];
                    try {
                        for (ua_instance_ids_1 = __values(ua_instance_ids), ua_instance_ids_1_1 = ua_instance_ids_1.next(); !ua_instance_ids_1_1.done; ua_instance_ids_1_1 = ua_instance_ids_1.next()) {
                            ua_instance_id = ua_instance_ids_1_1.value;
                            _f = __read(f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                                ua_instance_id: ua_instance_id,
                                message_toward_sip_id: message_toward_sip_id,
                                "delivered_date": null
                            }), 2), _sql_1 = _f[0], _values_1 = _f[1];
                            sql += _sql_1;
                            values = __spread(values, _values_1);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (ua_instance_ids_1_1 && !ua_instance_ids_1_1.done && (_g = ua_instance_ids_1.return)) _g.call(ua_instance_ids_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return [4 /*yield*/, query(sql, values)];
                case 10:
                    _h.sent();
                    return [2 /*return*/, message_toward_sip_id];
            }
        });
    }); });
    semasim.setMessageTowardSipDelivered = runExclusive.build(groupRef, function (uaInstancePk, message_toward_sip_id) { return __awaiter(_this, void 0, void 0, function () {
        var dongle_imei, instance_id, sql, values, ua_instance_id_ref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dongle_imei = uaInstancePk.dongle_imei, instance_id = uaInstancePk.instance_id;
                    sql = "";
                    values = [];
                    ua_instance_id_ref = "A";
                    sql += "SELECT @" + ua_instance_id_ref + ":=id FROM ua_instance WHERE dongle_imei = ? AND instance_id = ?;";
                    values = __spread(values, [dongle_imei, instance_id]);
                    (function () {
                        var _a = __read(f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                            "ua_instance_id": { "@": ua_instance_id_ref },
                            message_toward_sip_id: message_toward_sip_id,
                            "delivered_date": Date.now()
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += "\n" + _sql;
                        values = __spread(values, _values);
                    })();
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    semasim.getUndeliveredMessagesOfUaInstance = runExclusive.build(groupRef, function (uaInstancePk) { return __awaiter(_this, void 0, void 0, function () {
        var dongle_imei, instance_id, queryResult, messages, queryResult_2, queryResult_2_1, line, message, e_4, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dongle_imei = uaInstancePk.dongle_imei, instance_id = uaInstancePk.instance_id;
                    return [4 /*yield*/, query([
                            "SELECT message_toward_sip.id,",
                            "message_toward_sip.date,",
                            "message_toward_sip.from_number,",
                            "message_toward_sip.base64_text",
                            "FROM message_toward_sip",
                            "INNER JOIN sim",
                            "ON sim.iccid = message_toward_sip.sim_iccid",
                            "INNER JOIN dongle",
                            "ON dongle.sim_iccid = sim.iccid",
                            "INNER JOIN ua_instance",
                            "ON ua_instance.dongle_imei = dongle.imei",
                            "INNER JOIN ua_instance_message_toward_sip",
                            "ON  ua_instance_message_toward_sip.ua_instance_id = ua_instance.id",
                            "AND ua_instance_message_toward_sip.message_toward_sip_id = message_toward_sip.id",
                            "WHERE dongle.imei = ? AND ua_instance.instance_id = ? AND ua_instance_message_toward_sip.delivered_date IS NULL",
                            "ORDER BY message_toward_sip.date"
                        ].join("\n"), [dongle_imei, instance_id])];
                case 1:
                    queryResult = _b.sent();
                    messages = [];
                    try {
                        for (queryResult_2 = __values(queryResult), queryResult_2_1 = queryResult_2.next(); !queryResult_2_1.done; queryResult_2_1 = queryResult_2.next()) {
                            line = queryResult_2_1.value;
                            message = {
                                "id": line.id,
                                "date": new Date(line.date),
                                "from_number": line.from_number,
                                "text": (new Buffer(line.base64_text, "base64")).toString("utf8")
                            };
                            messages.push(message);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (queryResult_2_1 && !queryResult_2_1.done && (_a = queryResult_2.return)) _a.call(queryResult_2);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    return [2 /*return*/, messages];
            }
        });
    }); });
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var imei, iccid, uaInstancePk, number, text, date, text2, messageTowardSipId, messages, _a, _b, messageTowardGsmId, messages_, sent_message_id, sender_and_text, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    require("rejection-tracker").main(__dirname, "..", "..");
                    imei = "1111111111";
                    iccid = "222222222";
                    return [4 /*yield*/, semasim.addDongleAndSim(imei, iccid)];
                case 1:
                    _e.sent();
                    uaInstancePk = {
                        "dongle_imei": imei,
                        "instance_id": '"<urn:uuid:17b90ae9-1898-400c-8536-2f34435fd8c7>"'
                    };
                    return [4 /*yield*/, semasim.addUaInstance(uaInstancePk)];
                case 2:
                    _e.sent();
                    number = "0636786385";
                    text = "foo bar";
                    date = new Date();
                    text2 = "bar baz";
                    return [4 /*yield*/, semasim.addMessageTowardSip(number, text2, new Date(date.getTime() + 1), { "uaInstance": uaInstancePk })];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, semasim.addMessageTowardSip(number, text, date, { "allUaInstanceOfImei": imei })];
                case 4:
                    messageTowardSipId = _e.sent();
                    return [4 /*yield*/, semasim.addMessageTowardSip(number, "never", date, { "allUaInstanceOfEndpointOtherThan": uaInstancePk })];
                case 5:
                    _e.sent();
                    return [4 /*yield*/, semasim.getUndeliveredMessagesOfUaInstance(uaInstancePk)];
                case 6:
                    messages = _e.sent();
                    console.assert(messages.length === 2);
                    console.assert(messages[0].date.getTime() === date.getTime());
                    console.assert(messages[0].id === messageTowardSipId);
                    console.assert(messages[0].from_number === number);
                    console.assert(messages[0].text === text);
                    console.assert(messages[1].text === text2);
                    return [4 /*yield*/, semasim.setMessageTowardSipDelivered(uaInstancePk, messages[0].id)];
                case 7:
                    _e.sent();
                    return [4 /*yield*/, semasim.setMessageTowardSipDelivered(uaInstancePk, messages[1].id)];
                case 8:
                    _e.sent();
                    _b = (_a = console).assert;
                    return [4 /*yield*/, semasim.getUndeliveredMessagesOfUaInstance(uaInstancePk)];
                case 9:
                    _b.apply(_a, [(_e.sent()).length === 0]);
                    return [4 /*yield*/, semasim.addMessageTowardGsm(number, text, uaInstancePk)];
                case 10:
                    messageTowardGsmId = _e.sent();
                    return [4 /*yield*/, semasim.addMessageTowardGsm(number, text2, uaInstancePk)];
                case 11:
                    _e.sent();
                    return [4 /*yield*/, semasim.getUnsentMessageOfDongleSim(imei)];
                case 12:
                    messages_ = _e.sent();
                    console.assert(messages_.length === 2);
                    console.assert(messages_[0].id === messageTowardGsmId);
                    console.assert(messages_[0].sender.instance_id === uaInstancePk.instance_id);
                    console.assert(messages_[0].text === text);
                    console.assert(messages_[0].to_number === number);
                    sent_message_id = 111222;
                    return [4 /*yield*/, semasim.setMessageToGsmSentId(messageTowardGsmId, sent_message_id)];
                case 13:
                    _e.sent();
                    return [4 /*yield*/, semasim.getSenderAndTextOfSentMessageToGsm(imei, sent_message_id)];
                case 14:
                    sender_and_text = _e.sent();
                    console.assert(sender_and_text.text === text);
                    console.assert(sender_and_text.sender.instance_id === uaInstancePk.instance_id);
                    _d = (_c = console).assert;
                    return [4 /*yield*/, semasim.getUnsentMessageOfDongleSim(imei)];
                case 15:
                    _d.apply(_c, [(_e.sent())[0].text === text2]);
                    console.log("PASS!");
                    return [2 /*return*/];
            }
        });
    }); });
})(semasim = exports.semasim || (exports.semasim = {}));
