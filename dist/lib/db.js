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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var sipContact_1 = require("./sipContact");
var f = require("../tools/mySqlFunctions");
var MySqlEvents_1 = require("../tools/MySqlEvents");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_db");
var asterisk;
(function (asterisk) {
    var connectionConfig = __assign({}, _constants_1.c.dbParamsGateway, { "database": "asterisk" });
    /** is exported only for tests */
    asterisk.query = f.buildQueryFunction(connectionConfig);
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
                        return [4 /*yield*/, asterisk.query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.flush = flush;
    asterisk.evtNewContact = new ts_events_extended_1.SyncEvent();
    asterisk.evtExpiredContact = new ts_events_extended_1.SyncEvent();
    function startListeningPsContacts() {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, asterisk.query([
                            "DELETE FROM ps_contacts",
                            "WHERE endpoint LIKE '_______________'"
                        ].join("\n"))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, MySqlEvents_1.MySqlEvents.initialize(connectionConfig)];
                    case 2:
                        _a.sent();
                        MySqlEvents_1.MySqlEvents.instance.evtNewRow.attach(function (_a) {
                            var database = _a.database, table = _a.table;
                            return (database === connectionConfig.database &&
                                table === "ps_contacts");
                        }, function (_a) {
                            var row = _a.row;
                            return __awaiter(_this, void 0, void 0, function () {
                                var id, endpoint, path, uri, user_agent, psContact, contact;
                                return __generator(this, function (_b) {
                                    id = row.id, endpoint = row.endpoint, path = row.path, uri = row.uri, user_agent = row.user_agent;
                                    psContact = { id: id, endpoint: endpoint, path: path, uri: uri, user_agent: user_agent };
                                    contact = sipContact_1.PsContact.buildContact(psContact);
                                    asterisk.evtNewContact.post(contact);
                                    return [2 /*return*/];
                                });
                            });
                        });
                        MySqlEvents_1.MySqlEvents.instance.evtDeleteRow.attach(function (_a) {
                            var database = _a.database, table = _a.table;
                            return (database === connectionConfig.database &&
                                table === "ps_contacts");
                        }, function (_a) {
                            var row = _a.row;
                            return __awaiter(_this, void 0, void 0, function () {
                                var id, endpoint, path, uri, user_agent, psContact, contact;
                                return __generator(this, function (_b) {
                                    id = row.id, endpoint = row.endpoint, path = row.path, uri = row.uri, user_agent = row.user_agent;
                                    psContact = { id: id, endpoint: endpoint, path: path, uri: uri, user_agent: user_agent };
                                    contact = sipContact_1.PsContact.buildContact(psContact);
                                    asterisk.evtExpiredContact.post(contact);
                                    return [2 /*return*/];
                                });
                            });
                        });
                        return [2 /*return*/];
                }
            });
        });
    }
    asterisk.startListeningPsContacts = startListeningPsContacts;
    function deleteContact(contact) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            //TODO: this crash some times for some reasons
            var timerId = setTimeout(function () { return reject(new Error("Delete contact timeout error")); }, 3000);
            var queryPromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                var affectedRows, isDeleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, asterisk.query("DELETE FROM ps_contacts WHERE id=" + f.esc(contact.id))];
                        case 1:
                            affectedRows = (_a.sent()).affectedRows;
                            isDeleted = affectedRows ? true : false;
                            if (!isDeleted) {
                                asterisk.evtExpiredContact.detach(timerId);
                                clearTimeout(timerId);
                                resolve(false);
                            }
                            return [2 /*return*/];
                    }
                });
            }); })();
            asterisk.evtExpiredContact.attachOnceExtract(function (_a) {
                var id = _a.id;
                return id === contact.id;
            }, timerId, function (deletedContact) { return queryPromise.then(function () {
                clearTimeout(timerId);
                resolve(true);
            }); });
        });
    }
    asterisk.deleteContact = deleteContact;
    function createEndpointIfNeededAndGetPassword(imsi, renewPassword) {
        if (renewPassword === void 0) { renewPassword = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var sql, password;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = "";
                        sql += f.buildInsertQuery("ps_aors", {
                            "id": imsi,
                            "max_contacts": 12,
                            "qualify_frequency": 0,
                            "support_path": "yes"
                        }, "IGNORE");
                        sql += [
                            "INSERT INTO ps_auths ( id, auth_type, username, password, realm )",
                            "VALUES( " + f.esc(imsi) + ", 'userpass', " + f.esc(imsi) + ", MD5(RAND()), 'semasim' )",
                            "ON DUPLICATE KEY UPDATE",
                            renewPassword ? "password= VALUES(password)" : "id=id",
                            ";",
                            ""
                        ].join("\n");
                        sql += f.buildInsertQuery("ps_endpoints", {
                            "id": imsi,
                            "disallow": "all",
                            "allow": "alaw,ulaw",
                            "context": _constants_1.c.sipCallContext,
                            "message_context": _constants_1.c.sipMessageContext,
                            "subscribe_context": null,
                            "aors": imsi,
                            "auth": imsi,
                            "force_rport": null,
                            "from_domain": _constants_1.c.shared.domain,
                            "ice_support": "yes",
                            "direct_media": null,
                            "asymmetric_rtp_codec": null,
                            "rtcp_mux": null,
                            "direct_media_method": null,
                            "connected_line_method": null,
                            "transport": "transport-tcp",
                            "callerid_tag": null
                        }, "IGNORE");
                        sql += "SELECT password FROM ps_auths WHERE id= " + f.esc(imsi);
                        return [4 /*yield*/, asterisk.query(sql)];
                    case 1:
                        password = (_a.sent()).pop()[0].password;
                        return [2 /*return*/, password];
                }
            });
        });
    }
    asterisk.createEndpointIfNeededAndGetPassword = createEndpointIfNeededAndGetPassword;
})(asterisk = exports.asterisk || (exports.asterisk = {}));
var semasim;
(function (semasim) {
    semasim.query = f.buildQueryFunction(__assign({}, _constants_1.c.dbParamsGateway, { "database": "semasim" }));
    /** Only for test purpose */
    function flush() {
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = [
                            "DELETE FROM ua;",
                            "DELETE FROM message_toward_sip;"
                        ].join("\n");
                        return [4 /*yield*/, semasim.query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.flush = flush;
    function addUaSim(uaSim) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, imsi, ua, queryResults;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = "";
                        imsi = uaSim.imsi, ua = uaSim.ua;
                        sql += f.buildInsertQuery("ua", {
                            "instance": ua.instance,
                            "user_email": ua.userEmail,
                            "platform": ua.platform,
                            "push_token": ua.pushToken,
                            "software": ua.software
                        }, "UPDATE");
                        sql += [
                            "SELECT @ua_ref:=ua.id_",
                            "FROM ua",
                            "WHERE instance= " + f.esc(ua.instance) + " AND user_email= " + f.esc(ua.userEmail),
                            ";",
                            ""
                        ].join("\n");
                        sql += f.buildInsertQuery("ua_sim", {
                            "ua": { "@": "ua_ref" },
                            imsi: imsi
                        }, "IGNORE");
                        sql += [
                            "SELECT COUNT(*) as sim_ua_count",
                            "FROM ua_sim",
                            "WHERE imsi= " + f.esc(imsi)
                        ].join("\n");
                        return [4 /*yield*/, semasim.query(sql)];
                    case 1:
                        queryResults = _a.sent();
                        return [2 /*return*/, {
                                "isUaCreatedOrUpdated": queryResults[0].insertId !== 0,
                                "isFirstUaForSim": (queryResults[2].insertId !== 0 &&
                                    queryResults[3][0]["sim_ua_count"] === 1)
                            }];
                }
            });
        });
    }
    semasim.addUaSim = addUaSim;
    //TODO: test!
    function removeUaSim(imsi, uasToKeep) {
        if (uasToKeep === void 0) { uasToKeep = []; }
        return __awaiter(this, void 0, void 0, function () {
            var cond;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cond = uasToKeep.length ? [
                            " AND NOT ( ",
                            uasToKeep.map(function (ua) { return "ua.instance= " + f.esc(ua.instance) + " AND ua.user_email= " + f.esc(ua.userEmail); }).join(" OR "),
                            " )"
                        ].join("") : "";
                        return [4 /*yield*/, semasim.query([
                                "DELETE ua_sim.*",
                                "FROM ua_sim",
                                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                                "WHERE ua_sim.imsi= " + f.esc(imsi) + cond
                            ].join("\n"))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    semasim.removeUaSim = removeUaSim;
    ;
    var MessageTowardGsm;
    (function (MessageTowardGsm) {
        function add(toNumber, text, uaSim) {
            return __awaiter(this, void 0, void 0, function () {
                var sql;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sql = "";
                            sql += [
                                "SELECT @ua_sim_ref:= ua_sim.id_",
                                "FROM ua_sim",
                                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                                "WHERE",
                                [
                                    "ua_sim.imsi= " + f.esc(uaSim.imsi),
                                    "ua.instance = " + f.esc(uaSim.ua.instance),
                                    "ua.user_email= " + f.esc(uaSim.ua.userEmail)
                                ].join(" AND "),
                                ";",
                                ""
                            ].join("\n");
                            sql += f.buildInsertQuery("message_toward_gsm", {
                                "date": Date.now(),
                                "ua_sim": { "@": "ua_sim_ref" },
                                "to_number": toNumber,
                                "base64_text": f.b64.enc(text),
                                "send_date": null
                            }, "THROW ERROR");
                            return [4 /*yield*/, semasim.query(sql)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        MessageTowardGsm.add = add;
        function getUnsent(imsi) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                var rows, out, _loop_1, rows_1, rows_1_1, row, e_1, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, semasim.query([
                                "SELECT",
                                "message_toward_gsm.id_,",
                                "message_toward_gsm.date,",
                                "message_toward_gsm.to_number,",
                                "message_toward_gsm.base64_text,",
                                "ua_sim.imsi,",
                                "ua.instance,",
                                "ua.user_email,",
                                "ua.platform,",
                                "ua.push_token,",
                                "ua.software",
                                "FROM message_toward_gsm",
                                "INNER JOIN ua_sim ON ua_sim.id_ = message_toward_gsm.ua_sim",
                                "INNER JOIN ua ON ua.id_ = ua_sim.ua",
                                "WHERE ua_sim.imsi=" + f.esc(imsi) + " AND message_toward_gsm.send_date IS NULL",
                                "ORDER BY message_toward_gsm.date",
                                ";"
                            ].join("\n"))];
                        case 1:
                            rows = _b.sent();
                            out = [];
                            _loop_1 = function (row) {
                                var message = {
                                    "date": new Date(row["date"]),
                                    "uaSim": {
                                        "ua": {
                                            "instance": row["instance"],
                                            "userEmail": row["user_email"],
                                            "platform": row["platform"],
                                            "pushToken": row["push_token"],
                                            "software": row["software"]
                                        },
                                        "imsi": row["imsi"]
                                    },
                                    "toNumber": row["to_number"],
                                    "text": f.b64.dec(row["base64_text"])
                                };
                                var message_toward_gsm_id_ = row["id_"];
                                var confirm = {
                                    "setSent": function (sentDate) { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, semasim.query(f.buildInsertQuery("message_toward_gsm", {
                                                        "id_": message_toward_gsm_id_,
                                                        "send_date": sentDate ? sentDate.getTime() : -1
                                                    }, "UPDATE"))];
                                                case 1: return [2 /*return*/, _a.sent()];
                                            }
                                        });
                                    }); },
                                    "setStatusReport": function (statusReport) { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, semasim.query(f.buildInsertQuery("message_toward_gsm_status_report", {
                                                        "message_toward_gsm": message_toward_gsm_id_,
                                                        "is_delivered": statusReport.isDelivered ? 1 : 0,
                                                        "discharge_date": isNaN(statusReport.dischargeDate.getTime()) ?
                                                            null : statusReport.dischargeDate.getTime(),
                                                        "status": statusReport.status
                                                    }, "UPDATE"))];
                                                case 1: return [2 /*return*/, _a.sent()];
                                            }
                                        });
                                    }); }
                                };
                                out.push([message, confirm]);
                            };
                            try {
                                for (rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                                    row = rows_1_1.value;
                                    _loop_1(row);
                                }
                            }
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
                                }
                                finally { if (e_1) throw e_1.error; }
                            }
                            return [2 /*return*/, out];
                    }
                });
            });
        }
        MessageTowardGsm.getUnsent = getUnsent;
    })(MessageTowardGsm = semasim.MessageTowardGsm || (semasim.MessageTowardGsm = {}));
    function lastMessageReceivedDateBySim() {
        return __awaiter(this, void 0, void 0, function () {
            var rows, result, rows_2, rows_2_1, _a, imsi, last_received, e_2, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, semasim.query([
                            "SELECT",
                            "ua_sim.imsi,",
                            "MAX(message_toward_sip.date) AS last_received",
                            "FROM ua_sim",
                            "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
                            "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
                            "WHERE (message_toward_sip.is_report=0 OR message_toward_sip.is_report IS NULL)",
                            "GROUP BY imsi"
                        ].join("\n"))];
                    case 1:
                        rows = _c.sent();
                        result = {};
                        try {
                            for (rows_2 = __values(rows), rows_2_1 = rows_2.next(); !rows_2_1.done; rows_2_1 = rows_2.next()) {
                                _a = rows_2_1.value, imsi = _a.imsi, last_received = _a.last_received;
                                result[imsi] = new Date(last_received || 0);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (rows_2_1 && !rows_2_1.done && (_b = rows_2.return)) _b.call(rows_2);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    }
    semasim.lastMessageReceivedDateBySim = lastMessageReceivedDateBySim;
    var MessageTowardSip;
    (function (MessageTowardSip) {
        /** return true if message_toward_sip added */
        function add(fromNumber, text, date, isReport, target) {
            return __awaiter(this, void 0, void 0, function () {
                var sqlSelectionUaSim, queryResults;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sqlSelectionUaSim = [
                                "FROM ua_sim",
                                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                                "WHERE ua_sim.imsi= "
                            ].join("\n");
                            switch (target.target) {
                                case "SPECIFIC UA REGISTERED TO SIM":
                                    sqlSelectionUaSim += [
                                        "" + f.esc(target.uaSim.imsi),
                                        "ua.instance= " + f.esc(target.uaSim.ua.instance),
                                        "ua.user_email= " + f.esc(target.uaSim.ua.userEmail)
                                    ].join(" AND ");
                                    break;
                                case "ALL UA REGISTERED TO SIM":
                                    sqlSelectionUaSim += "" + f.esc(target.imsi);
                                    break;
                                case "ALL OTHER UA OF USER REGISTERED TO SIM":
                                    sqlSelectionUaSim += [
                                        "" + f.esc(target.uaSim.imsi),
                                        "ua.instance <> " + f.esc(target.uaSim.ua.instance),
                                        "ua.user_email= " + f.esc(target.uaSim.ua.userEmail)
                                    ].join(" AND ");
                                    break;
                                case "ALL UA OF OTHER USERS REGISTERED TO SIM":
                                    sqlSelectionUaSim += [
                                        "" + f.esc(target.uaSim.imsi),
                                        "ua.user_email<> " + f.esc(target.uaSim.ua.userEmail)
                                    ].join(" AND ");
                                    break;
                            }
                            return [4 /*yield*/, semasim.query([
                                    "INSERT INTO message_toward_sip ( is_report, date, from_number, base64_text )",
                                    "SELECT",
                                    [
                                        f.esc(isReport ? 1 : 0),
                                        f.esc(date.getTime()),
                                        f.esc(fromNumber),
                                        f.esc(f.b64.enc(text))
                                    ].join(", "),
                                    sqlSelectionUaSim,
                                    "HAVING COUNT(*) <> 0",
                                    ";",
                                    "INSERT INTO ua_sim_message_toward_sip",
                                    "( ua_sim, message_toward_sip, delivered_date )",
                                    "SELECT ua_sim.id_, LAST_INSERT_ID(), NULL",
                                    sqlSelectionUaSim
                                ].join("\n"))];
                        case 1:
                            queryResults = _a.sent();
                            return [2 /*return*/, queryResults[0].insertId !== 0];
                    }
                });
            });
        }
        MessageTowardSip.add = add;
        function unsentCount(uaSim) {
            return __awaiter(this, void 0, void 0, function () {
                var sql;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sql = [
                                "SELECT COUNT(*) AS count",
                                "FROM message_toward_sip",
                                "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
                                "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
                                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                                "WHERE",
                                [
                                    "ua_sim_message_toward_sip.delivered_date IS NULL",
                                    "ua_sim.imsi= " + f.esc(uaSim.imsi),
                                    "ua.instance= " + f.esc(uaSim.ua.instance),
                                    "ua.user_email= " + f.esc(uaSim.ua.userEmail)
                                ].join(" AND ")
                            ].join("\n");
                            return [4 /*yield*/, semasim.query(sql)];
                        case 1: return [2 /*return*/, (_a.sent())[0]["count"]];
                    }
                });
            });
        }
        MessageTowardSip.unsentCount = unsentCount;
        /** Return array of [ MessageTowardSip, setDelivered ] */
        function getUnsent(uaSim) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                var sql, rows, out, _loop_2, rows_3, rows_3_1, row, e_3, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            sql = [
                                "SELECT",
                                "message_toward_sip.is_report,",
                                "message_toward_sip.date,",
                                "message_toward_sip.from_number,",
                                "message_toward_sip.base64_text,",
                                "ua_sim_message_toward_sip.id_",
                                "FROM message_toward_sip",
                                "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
                                "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
                                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                                "WHERE",
                                [
                                    "ua_sim_message_toward_sip.delivered_date IS NULL",
                                    "ua_sim.imsi= " + f.esc(uaSim.imsi),
                                    "ua.instance= " + f.esc(uaSim.ua.instance),
                                    "ua.user_email= " + f.esc(uaSim.ua.userEmail)
                                ].join(" AND "),
                                "ORDER BY message_toward_sip.date"
                            ].join("\n");
                            return [4 /*yield*/, semasim.query(sql)];
                        case 1:
                            rows = _b.sent();
                            out = new Array();
                            _loop_2 = function (row) {
                                var message = {
                                    "date": new Date(row["date"]),
                                    "fromNumber": row["from_number"],
                                    "isReport": row["is_report"] === 1,
                                    "text": f.b64.dec(row["base64_text"])
                                };
                                var setReceived = function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, semasim.query(f.buildInsertQuery("ua_sim_message_toward_sip", {
                                                    "id_": row["id_"],
                                                    "delivered_date": Date.now()
                                                }, "UPDATE"))];
                                            case 1: return [2 /*return*/, _a.sent()];
                                        }
                                    });
                                }); };
                                out.push([message, setReceived]);
                            };
                            try {
                                for (rows_3 = __values(rows), rows_3_1 = rows_3.next(); !rows_3_1.done; rows_3_1 = rows_3.next()) {
                                    row = rows_3_1.value;
                                    _loop_2(row);
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (rows_3_1 && !rows_3_1.done && (_a = rows_3.return)) _a.call(rows_3);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            return [2 /*return*/, out];
                    }
                });
            });
        }
        MessageTowardSip.getUnsent = getUnsent;
    })(MessageTowardSip = semasim.MessageTowardSip || (semasim.MessageTowardSip = {}));
})(semasim = exports.semasim || (exports.semasim = {}));
