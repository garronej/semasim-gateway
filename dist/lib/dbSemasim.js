"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUas = exports.onCallFromSipTerminated = exports.onTargetGsmRinging = exports.lastMessageReceivedDateBySim = exports.getUnsentMessagesTowardGsm = exports.getUnsentMessagesTowardSip = exports.messageTowardSipUnsentCount = exports.onCallAnswered = exports.onMissedCall = exports.onDongleMessage = exports.onSipMessage = exports.removeUaSim = exports.addUaSim = exports.setTowardSimKeys = exports.getTowardSimKeys = exports.flush = exports.launch = exports.beforeExit = exports._ = void 0;
var sqliteCustom = require("sqlite-custom");
var i = require("../bin/installer");
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = function () { return Promise.resolve(); };
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
/** Must be called and awaited before use */
function launch() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sqliteCustom.connectAndGetApi(i.semasim_db_path, "HANDLE STRING ENCODING")];
                case 1:
                    //sqliteCustom.enableLog();
                    exports._ = _a.sent();
                    beforeExit.impl = function () { return exports._.close(); };
                    return [2 /*return*/];
            }
        });
    });
}
exports.launch = launch;
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
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.flush = flush;
function getTowardSimKeys(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, _a, row;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sql = [
                        "SELECT encrypt_key, decrypt_key",
                        "FROM toward_sim_keys",
                        "WHERE imsi=" + exports._.esc(imsi)
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a = __read.apply(void 0, [_b.sent(), 1]), row = _a[0];
                    return [2 /*return*/, row !== undefined ? ({
                            "encryptKeyStr": row["encrypt_key"],
                            "decryptKeyStr": row["decrypt_key"]
                        }) : undefined];
            }
        });
    });
}
exports.getTowardSimKeys = getTowardSimKeys;
function setTowardSimKeys(imsi, encryptKeyStr, decryptKeyStr) {
    return __awaiter(this, void 0, void 0, function () {
        var sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = exports._.buildInsertOrUpdateQueries("toward_sim_keys", {
                        imsi: imsi,
                        "encrypt_key": encryptKeyStr,
                        "decrypt_key": decryptKeyStr
                    }, ["imsi"]);
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.setTowardSimKeys = setTowardSimKeys;
function addUaSim(uaSim) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, imsi, ua, queryResults;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "";
                    imsi = uaSim.imsi, ua = uaSim.ua;
                    sql += exports._.buildInsertOrUpdateQueries("ua", {
                        "instance": ua.instance,
                        "user_email": ua.userEmail,
                        "toward_user_encrypt_key": ua.towardUserEncryptKeyStr,
                        "platform": ua.platform,
                        "push_token": ua.pushToken
                    }, ["instance", "user_email"]);
                    sql += [
                        "INSERT OR IGNORE INTO ua_sim ( ua, imsi )",
                        "SELECT id_, " + exports._.esc(imsi),
                        "FROM ua",
                        "WHERE instance=" + exports._.esc(ua.instance) + " AND user_email=" + exports._.esc(ua.userEmail),
                        ";",
                        ""
                    ].join("\n");
                    sql += [
                        "SELECT COUNT(*) as sim_ua_count",
                        "FROM ua_sim",
                        "WHERE imsi= " + exports._.esc(imsi)
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    queryResults = _a.sent();
                    return [2 /*return*/, {
                            "isFirstUaForSim": (!!queryResults[2].affectedRows &&
                                queryResults[3][0]["sim_ua_count"] === 1)
                        }];
            }
        });
    });
}
exports.addUaSim = addUaSim;
//TODO: refactor, it's unclear what this function does
function removeUaSim(imsi, uasToKeep) {
    if (uasToKeep === void 0) { uasToKeep = []; }
    return __awaiter(this, void 0, void 0, function () {
        var condition;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    condition = uasToKeep.length ? [
                        "NOT ( ",
                        uasToKeep.map(function (ua) { return "ua.instance=" + exports._.esc(ua.instance) + " AND ua.user_email=" + exports._.esc(ua.userEmail); }).join(" OR "),
                        " )"
                    ].join("") : "1";
                    return [4 /*yield*/, exports._.query([
                            "DELETE FROM ua_sim",
                            "WHERE imsi=" + exports._.esc(imsi) + " AND ua IN ( SELECT id_ from ua WHERE " + condition + " )"
                        ].join("\n"))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.removeUaSim = removeUaSim;
/**
 *
 * to call when sip message received.
 *
 * @param toNumber phone number to send to
 * @param text
 * @param uaSim uaSim that emitted the message
 * @param date this is the exactSendDate that was bundled
 * by the client app in the SIP MESSAGE header, it is used as an id
 * so that the client find to witch message correspond the
 * sendReport and statusReport.
 *
 * NOTE: no new sip message added to the queue.
 * Queue a new messageTowardGsm
 *
 */
function onSipMessage(toNumber, text, uaSim, date, appendPromotionalMessage) {
    return __awaiter(this, void 0, void 0, function () {
        var sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "INSERT INTO message_toward_gsm ( date, ua_sim, to_number, text, send_date, append_promotional_message)",
                        "SELECT",
                        [
                            exports._.esc(date.getTime()),
                            "ua_sim.id_",
                            exports._.esc(toNumber),
                            exports._.esc(text),
                            "NULL",
                            sqliteCustom.bool.enc(appendPromotionalMessage)
                        ].join(", "),
                        "FROM ua_sim",
                        "INNER JOIN ua ON ua.id_= ua_sim.ua",
                        "WHERE",
                        [
                            "ua_sim.imsi= " + exports._.esc(uaSim.imsi),
                            "ua.instance = " + exports._.esc(uaSim.ua.instance),
                            "ua.user_email= " + exports._.esc(uaSim.ua.userEmail)
                        ].join(" AND "),
                        ";",
                        ""
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.onSipMessage = onSipMessage;
/**
 * to call when a SMS is received by a dongle
 *
 * Return true if there is an ua registered to this SIM.
 * If not the message is not stored in DB.
 *
 * @param fromNumber
 * txt       => number of who sent the SMS
 *
 * @param text
 * txt       => SMS
 *
 * @param date
 * txt       => date the SMS have been sent read from PDU
 *
 * */
function onDongleMessage(fromNumber, text, date, imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var bundledData, sql, queryResults;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bundledData = !!text.match(/^\0.+TYPE=.+http/) ?
                        (function () {
                            var out = {
                                "type": "MMS NOTIFICATION",
                                "pduDateTime": date.getTime(),
                                "wapPushMessage": text,
                                "text": [
                                    "MMS notification received.\n",
                                    "Semasim does not support MMS yet.\n",
                                    "Note that some phones automatically convert long SMS into MMS.",
                                    "If you suspect it is what might have happen here you could ask your",
                                    "contact to send the message again splitting it into smaller parts.",
                                    "All apologies for the inconvenience."
                                ].join(" ")
                            };
                            return out;
                        })() : (function () {
                        var out = {
                            "type": "MESSAGE",
                            "pduDateTime": date.getTime(),
                            text: text
                        };
                        return out;
                    })();
                    sql = buildMessageTowardSipInsertQuery(true, fromNumber, date, bundledData, {
                        "target": "ALL UA REGISTERED TO SIM",
                        imsi: imsi
                    });
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    queryResults = _a.sent();
                    return [2 /*return*/, queryResults[0].insertId !== 0];
            }
        });
    });
}
exports.onDongleMessage = onDongleMessage;
/**
 * to call when when a call have been missed
 *
 * will create the message toward sip to notify UAs about it.
 *
 * */
function onMissedCall(imsi, number) {
    return __awaiter(this, void 0, void 0, function () {
        var date, bundledData, sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    date = new Date();
                    bundledData = {
                        "type": "MISSED CALL",
                        "dateTime": date.getTime(),
                        "text": "Missed call"
                    };
                    sql = buildMessageTowardSipInsertQuery(false, number, date, bundledData, {
                        "target": "ALL UA REGISTERED TO SIM",
                        imsi: imsi
                    });
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.onMissedCall = onMissedCall;
/**
 *
 * to call when a call have been answered,
 *
 * will inform ua of other users that the call have been taken.
 *
*/
function onCallAnswered(number, imsi, answeredByUa, otherUasReachedForTheCall) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, date, bundledData, otherUasReachedForTheCall_1, otherUasReachedForTheCall_1_1, ua;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sql = "";
                    date = new Date();
                    bundledData = {
                        "type": "CALL ANSWERED BY",
                        "dateTime": date.getTime(),
                        "ua": answeredByUa,
                        "text": "Call answered by " + answeredByUa.userEmail
                    };
                    try {
                        for (otherUasReachedForTheCall_1 = __values(otherUasReachedForTheCall), otherUasReachedForTheCall_1_1 = otherUasReachedForTheCall_1.next(); !otherUasReachedForTheCall_1_1.done; otherUasReachedForTheCall_1_1 = otherUasReachedForTheCall_1.next()) {
                            ua = otherUasReachedForTheCall_1_1.value;
                            if (ua.userEmail === answeredByUa.userEmail) {
                                continue;
                            }
                            sql += buildMessageTowardSipInsertQuery(false, number, date, bundledData, {
                                "target": "SPECIFIC UA REGISTERED TO SIM",
                                "uaSim": { ua: ua, imsi: imsi }
                            });
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (otherUasReachedForTheCall_1_1 && !otherUasReachedForTheCall_1_1.done && (_a = otherUasReachedForTheCall_1.return)) _a.call(otherUasReachedForTheCall_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (!sql) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.onCallAnswered = onCallAnswered;
/** Check if a ua registration have message pending */
function messageTowardSipUnsentCount(uaSim) {
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
                            "ua_sim.imsi= " + exports._.esc(uaSim.imsi),
                            "ua.instance= " + exports._.esc(uaSim.ua.instance),
                            "ua.user_email= " + exports._.esc(uaSim.ua.userEmail)
                        ].join(" AND ")
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1: return [2 /*return*/, (_a.sent())[0]["count"]];
            }
        });
    });
}
exports.messageTowardSipUnsentCount = messageTowardSipUnsentCount;
/** Return array of tuples [ MessageTowardSip, <method to set the message as received> ] */
function getUnsentMessagesTowardSip(uaSim) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows, out, _loop_1, rows_1, rows_1_1, row;
        var e_2, _a;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sql = [
                        "SELECT",
                        "message_toward_sip.is_from_dongle,",
                        "message_toward_sip.bundled_data,",
                        "message_toward_sip.date,",
                        "message_toward_sip.from_number,",
                        "ua_sim_message_toward_sip.id_",
                        "FROM message_toward_sip",
                        "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
                        "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
                        "INNER JOIN ua ON ua.id_= ua_sim.ua",
                        "WHERE",
                        [
                            "ua_sim_message_toward_sip.delivered_date IS NULL",
                            "ua_sim.imsi= " + exports._.esc(uaSim.imsi),
                            "ua.instance= " + exports._.esc(uaSim.ua.instance),
                            "ua.user_email= " + exports._.esc(uaSim.ua.userEmail)
                        ].join(" AND "),
                        "ORDER BY message_toward_sip.date"
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    rows = _b.sent();
                    out = new Array();
                    _loop_1 = function (row) {
                        var message = {
                            "dateTime": row["date"],
                            "fromNumber": row["from_number"],
                            "isFromDongle": sqliteCustom.bool.dec(row["is_from_dongle"]),
                            "bundledData": JSON.parse(row["bundled_data"])
                        };
                        var onReceived = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, exports._.query(exports._.buildInsertOrUpdateQueries("ua_sim_message_toward_sip", {
                                            "id_": row["id_"],
                                            "delivered_date": Date.now()
                                        }, ["id_"]))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        out.push([message, onReceived]);
                    };
                    try {
                        for (rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                            row = rows_1_1.value;
                            _loop_1(row);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [2 /*return*/, out];
            }
        });
    });
}
exports.getUnsentMessagesTowardSip = getUnsentMessagesTowardSip;
/**
 *
 * Provide the SMS that need to be send via Dongle.
 *
 * return an array of tuple [ MessageTowardGsm, <method to set the send date and status report> ]
 *
 * */
function getUnsentMessagesTowardGsm(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, out, _loop_2, rows_2, rows_2_1, row;
        var e_3, _a;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, exports._.query([
                        "SELECT",
                        "message_toward_gsm.id_,",
                        "message_toward_gsm.date,",
                        "message_toward_gsm.to_number,",
                        "message_toward_gsm.text,",
                        "message_toward_gsm.append_promotional_message,",
                        "ua_sim.imsi,",
                        "ua.instance,",
                        "ua.user_email,",
                        "ua.platform,",
                        "ua.push_token,",
                        "ua.toward_user_encrypt_key",
                        "FROM message_toward_gsm",
                        "INNER JOIN ua_sim ON ua_sim.id_ = message_toward_gsm.ua_sim",
                        "INNER JOIN ua ON ua.id_ = ua_sim.ua",
                        "WHERE ua_sim.imsi=" + exports._.esc(imsi) + " AND message_toward_gsm.send_date IS NULL",
                        "ORDER BY message_toward_gsm.date",
                        ";"
                    ].join("\n"))];
                case 1:
                    rows = _b.sent();
                    out = [];
                    _loop_2 = function (row) {
                        var message = {
                            "dateTime": row["date"],
                            "uaSim": {
                                "ua": {
                                    "instance": row["instance"],
                                    "userEmail": row["user_email"],
                                    "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
                                    "platform": row["platform"],
                                    "pushToken": row["push_token"]
                                },
                                "imsi": row["imsi"]
                            },
                            "toNumber": row["to_number"],
                            "text": row["text"],
                            "appendPromotionalMessage": sqliteCustom.bool.dec(row["append_promotional_message"])
                        };
                        var message_toward_gsm_id_ = row["id_"];
                        var setSentPr;
                        out.push([
                            message,
                            {
                                "onSent": function (sendDate) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                setSentPr = getUnsentMessagesTowardGsm.onSent(message_toward_gsm_id_, message, sendDate);
                                                return [4 /*yield*/, setSentPr];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                "onStatusReport": function (statusReport) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, setSentPr];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, getUnsentMessagesTowardGsm.onStatusReport(message, statusReport)];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }
                            }
                        ]);
                    };
                    try {
                        for (rows_2 = __values(rows), rows_2_1 = rows_2.next(); !rows_2_1.done; rows_2_1 = rows_2.next()) {
                            row = rows_2_1.value;
                            _loop_2(row);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (rows_2_1 && !rows_2_1.done && (_a = rows_2.return)) _a.call(rows_2);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return [2 /*return*/, out];
            }
        });
    });
}
exports.getUnsentMessagesTowardGsm = getUnsentMessagesTowardGsm;
(function (getUnsentMessagesTowardGsm) {
    var _a = __read([
        "e29c94",
        "e29d8c"
    ].map(function (code) { return Buffer.from(code, "hex").toString("utf8"); }), 2), checkMark = _a[0], crossMark = _a[1];
    /**
     *
     * Set message toward sip as received in the db and create Send report
     *
     * sendDate correspond to the exact time the message have been sent by dongle,
     * null if send failed.
     *
    */
    function onSent(messageTowardGsm_id, messageTowardGsm, sendDate) {
        return __awaiter(this, void 0, void 0, function () {
            var isSuccess, sql, bundledData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isSuccess = sendDate ? true : false;
                        sql = exports._.buildInsertOrUpdateQueries("message_toward_gsm", {
                            "id_": messageTowardGsm_id,
                            "send_date": isSuccess ? sendDate.getTime() : -1
                        }, ["id_"]);
                        bundledData = {
                            "type": "SEND REPORT",
                            messageTowardGsm: messageTowardGsm,
                            "sendDateTime": sendDate === null ? null : sendDate.getTime(),
                            "text": isSuccess ? checkMark : crossMark
                        };
                        sql += buildMessageTowardSipInsertQuery(false, messageTowardGsm.toNumber, new Date(), bundledData, {
                            "target": "SPECIFIC UA REGISTERED TO SIM",
                            "uaSim": messageTowardGsm.uaSim
                        });
                        return [4 /*yield*/, exports._.query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    getUnsentMessagesTowardGsm.onSent = onSent;
    function onStatusReport(messageTowardGsm, statusReport) {
        return __awaiter(this, void 0, void 0, function () {
            var now, build, sql;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        //TODO: may be useless...depend of operator I assume
                        if (isNaN(statusReport.dischargeDate.getTime())) {
                            statusReport.dischargeDate = new Date();
                        }
                        ;
                        now = new Date();
                        build = function (text, target) {
                            var bundledData = {
                                "type": "STATUS REPORT",
                                messageTowardGsm: messageTowardGsm,
                                "statusReport": {
                                    "dischargeDateTime": statusReport.dischargeDate.getTime(),
                                    "isDelivered": statusReport.isDelivered,
                                    "recipient": statusReport.recipient,
                                    "sendDateTime": statusReport.sendDate.getTime(),
                                    "status": statusReport.status
                                },
                                text: text
                            };
                            return buildMessageTowardSipInsertQuery(false, messageTowardGsm.toNumber, now, bundledData, target);
                        };
                        sql = "";
                        if (statusReport.isDelivered) {
                            sql += build("" + checkMark + checkMark, {
                                "target": "SPECIFIC UA REGISTERED TO SIM",
                                "uaSim": messageTowardGsm.uaSim
                            });
                            sql += build("Me: " + messageTowardGsm.text, {
                                "target": "ALL OTHER UA OF USER",
                                "uaSim": messageTowardGsm.uaSim
                            });
                            sql += build(messageTowardGsm.uaSim.ua.userEmail + ": " + messageTowardGsm.text, {
                                "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                                "uaSim": messageTowardGsm.uaSim
                            });
                        }
                        else {
                            sql += build(crossMark, {
                                "target": "SPECIFIC UA REGISTERED TO SIM",
                                "uaSim": messageTowardGsm.uaSim
                            });
                        }
                        return [4 /*yield*/, exports._.query(sql)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    getUnsentMessagesTowardGsm.onStatusReport = onStatusReport;
})(getUnsentMessagesTowardGsm = exports.getUnsentMessagesTowardGsm || (exports.getUnsentMessagesTowardGsm = {}));
/**
 *
 * Only used to recover after being down to know from when
 * we have to pull the SMS of chan-dongle-extended
 *
 */
function lastMessageReceivedDateBySim() {
    return __awaiter(this, void 0, void 0, function () {
        var rows, result, rows_3, rows_3_1, _a, imsi, last_received;
        var e_4, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, exports._.query([
                        "SELECT",
                        "ua_sim.imsi,",
                        "MAX(message_toward_sip.date) AS last_received",
                        "FROM ua_sim",
                        "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
                        "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
                        "WHERE (message_toward_sip.is_from_dongle=1 OR message_toward_sip.is_from_dongle IS NULL)",
                        "GROUP BY imsi"
                    ].join("\n"))];
                case 1:
                    rows = _c.sent();
                    result = {};
                    try {
                        for (rows_3 = __values(rows), rows_3_1 = rows_3.next(); !rows_3_1.done; rows_3_1 = rows_3.next()) {
                            _a = rows_3_1.value, imsi = _a.imsi, last_received = _a.last_received;
                            result[imsi] = new Date(last_received || 0);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (rows_3_1 && !rows_3_1.done && (_b = rows_3.return)) _b.call(rows_3);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.lastMessageReceivedDateBySim = lastMessageReceivedDateBySim;
/**
 *
 * @param isFromDongle
 * Message toward SIP can be of two types:
 * txt       => true, SMS received via dongle.
 * signaling => false, notifications that are not actual SMS, (status report, missed calls, ect...)
 *
 * @param fromNumber
 * txt       => number of who sent the SMS
 * signaling => MessageTowardGsm.toNumber
 *
 * @param text
 * txt       => SMS
 * signaling => text to display on linphone clients
 *
 * @param date
 * txt       => date the SMS have been sent read from PDU
 * signaling => now
 *
 * @param bundledData
 * data that will be smuggled in SIP headers
 *
 * @param target
 * targeted UAs
 *
 */
function buildMessageTowardSipInsertQuery(isFromDongle, fromNumber, date, bundledData, target) {
    var sqlSelectionUaSim = [
        "FROM ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        "WHERE ua_sim.imsi= "
    ].join("\n");
    switch (target.target) {
        case "SPECIFIC UA REGISTERED TO SIM":
            sqlSelectionUaSim += [
                exports._.esc(target.uaSim.imsi),
                "ua.instance= " + exports._.esc(target.uaSim.ua.instance),
                "ua.user_email= " + exports._.esc(target.uaSim.ua.userEmail)
            ].join(" AND ");
            break;
        case "ALL UA REGISTERED TO SIM":
            sqlSelectionUaSim += "" + exports._.esc(target.imsi);
            break;
        case "ALL UA OF USER":
            sqlSelectionUaSim += [
                exports._.esc(target.uaSim.imsi),
                "ua.user_email= " + exports._.esc(target.uaSim.ua.userEmail)
            ].join(" AND ");
            break;
        case "ALL OTHER UA OF USER":
            sqlSelectionUaSim += [
                exports._.esc(target.uaSim.imsi),
                "ua.instance <> " + exports._.esc(target.uaSim.ua.instance),
                "ua.user_email= " + exports._.esc(target.uaSim.ua.userEmail)
            ].join(" AND ");
            break;
        case "ALL UA OF OTHER USERS REGISTERED TO SIM":
            sqlSelectionUaSim += [
                exports._.esc(target.uaSim.imsi),
                "ua.user_email<> " + exports._.esc(target.uaSim.ua.userEmail)
            ].join(" AND ");
            break;
    }
    var sql = [
        "INSERT INTO message_toward_sip ( is_from_dongle, bundled_data, date, from_number)",
        "SELECT",
        [
            sqliteCustom.bool.enc(isFromDongle),
            exports._.esc(JSON.stringify(bundledData)),
            exports._.esc(date.getTime()),
            exports._.esc(fromNumber)
        ].join(", "),
        sqlSelectionUaSim,
        "GROUP BY NULL",
        ";",
        exports._.buildSetVarQuery("message_toward_sip_id", "integer_value", "last_insert_rowid()"),
        "INSERT INTO ua_sim_message_toward_sip",
        "( ua_sim, message_toward_sip, delivered_date )",
        "SELECT ua_sim.id_, " + exports._.buildGetVarQuery("message_toward_sip_id") + ", NULL",
        sqlSelectionUaSim,
        ";",
        ""
    ].join("\n");
    return sql;
}
/**
 *
 * TODO: include in tests
 *
 * Notify specific ua that the phone it's trying to reach is ringing.
 *
 * @param uaSim The uaSim that originated the call.
 * @param number The target phone number.
 *
 * (For now it only send to web ua)
 *
 *
 */
function onTargetGsmRinging(contact, number, callId) {
    return __awaiter(this, void 0, void 0, function () {
        var bundledData, sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (contact.uaSim.ua.platform !== "web") {
                        return [2 /*return*/];
                    }
                    bundledData = {
                        "type": "RINGBACK",
                        callId: callId,
                        "text": "( notify ringback )"
                    };
                    sql = buildMessageTowardSipInsertQuery(false, number, new Date(), bundledData, {
                        "target": "SPECIFIC UA REGISTERED TO SIM",
                        "uaSim": contact.uaSim
                    });
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.onTargetGsmRinging = onTargetGsmRinging;
function onCallFromSipTerminated(number, imsi, callPlacedAtDateTime, callRingingAfterMs, callAnsweredAfterMs, callTerminatedAfterMs, ua) {
    return __awaiter(this, void 0, void 0, function () {
        var buildQuery, uaSim, buildText, sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    buildQuery = function (text, target) { return buildMessageTowardSipInsertQuery(false, number, new Date(callPlacedAtDateTime), (function () {
                        var bundledData = {
                            "type": "FROM SIP CALL SUMMARY",
                            callPlacedAtDateTime: callPlacedAtDateTime,
                            callRingingAfterMs: callRingingAfterMs,
                            callAnsweredAfterMs: callAnsweredAfterMs,
                            callTerminatedAfterMs: callTerminatedAfterMs,
                            ua: ua,
                            text: text
                        };
                        return bundledData;
                    })(), target); };
                    uaSim = { imsi: imsi, ua: ua };
                    buildText = function (email) {
                        var byText = email === undefined ? "" : "by " + email;
                        if (callAnsweredAfterMs !== undefined) {
                            var formatedCallDuration = (function () {
                                var date = new Date(0);
                                date.setMilliseconds(callTerminatedAfterMs - callAnsweredAfterMs);
                                return date.toISOString().substr(11, 8);
                            })();
                            return "Call placed " + byText + ", duration: " + formatedCallDuration;
                        }
                        else if (callRingingAfterMs !== undefined) {
                            return "Call placed " + byText + ", hanged up before being established.";
                        }
                        else {
                            return "Aborted attempt to place call " + byText;
                        }
                    };
                    sql = [
                        buildQuery(buildText(undefined), {
                            "target": "ALL UA OF USER",
                            uaSim: uaSim
                        }),
                        buildQuery(buildText(ua.userEmail), {
                            "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                            uaSim: uaSim
                        })
                    ].join("");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.onCallFromSipTerminated = onCallFromSipTerminated;
function getUas(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "SELECT ua.*",
                        "FROM ua",
                        "INNER JOIN ua_sim ON ua_sim.ua=ua.id_",
                        "WHERE ua_sim.imsi=" + exports._.esc(imsi)
                    ].join("\n");
                    return [4 /*yield*/, exports._.query(sql)];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, rows.map(function (row) { return ({
                            "instance": row["instance"],
                            "userEmail": row["user_email"],
                            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
                            "platform": row["platform"],
                            "pushToken": row["push_token"]
                        }); })];
            }
        });
    });
}
exports.getUas = getUas;
