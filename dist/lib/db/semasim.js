"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysqlCustom = require("../../tools/mysqlCustom");
const transfer_tools_1 = require("transfer-tools");
const c = require("../_constants");
const JSON_CUSTOM = transfer_tools_1.JSON_CUSTOM.get();
let esc;
let buildInsertQuery;
/** Must be called and awaited before use */
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        let api = yield mysqlCustom.connectAndGetApi(Object.assign({}, c.dbParamsGateway, { "database": "semasim" }), "HANDLE STRING ENCODING");
        exports.query = api.query;
        esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;
    });
}
exports.launch = launch;
/** Only for test purpose */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "DELETE FROM ua;",
            "DELETE FROM message_toward_sip;"
        ].join("\n");
        yield exports.query(sql);
    });
}
exports.flush = flush;
function addUaSim(uaSim) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = "";
        let { imsi, ua } = uaSim;
        sql += buildInsertQuery("ua", {
            "instance": ua.instance,
            "user_email": ua.userEmail,
            "platform": ua.platform,
            "push_token": ua.pushToken,
            "software": ua.software
        }, "UPDATE");
        sql += [
            "SELECT @ua_ref:=ua.id_",
            "FROM ua",
            `WHERE instance= ${esc(ua.instance)} AND user_email= ${esc(ua.userEmail)}`,
            ";",
            ""
        ].join("\n");
        sql += buildInsertQuery("ua_sim", {
            "ua": { "@": "ua_ref" },
            imsi
        }, "IGNORE");
        sql += [
            `SELECT COUNT(*) as sim_ua_count`,
            "FROM ua_sim",
            `WHERE imsi= ${esc(imsi)}`
        ].join("\n");
        let queryResults = yield exports.query(sql);
        return {
            "isUaCreatedOrUpdated": queryResults[0].insertId !== 0,
            "isFirstUaForSim": (queryResults[2].insertId !== 0 &&
                queryResults[3][0]["sim_ua_count"] === 1)
        };
    });
}
exports.addUaSim = addUaSim;
function removeUaSim(imsi, uasToKeep = []) {
    return __awaiter(this, void 0, void 0, function* () {
        let condition = uasToKeep.length ? [
            " AND NOT ( ",
            uasToKeep.map(ua => `ua.instance= ${esc(ua.instance)} AND ua.user_email= ${esc(ua.userEmail)}`).join(" OR "),
            " )"
        ].join("") : "";
        yield exports.query([
            "DELETE ua_sim.*",
            "FROM ua_sim",
            "INNER JOIN ua ON ua.id_= ua_sim.ua",
            `WHERE ua_sim.imsi= ${esc(imsi)}${condition}`
        ].join("\n"));
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
 * @param date when the message was emitted by the user (provided only by web ua)
 *
 * NOTE: no new sip message added to the queue.
 *
 */
function onSipMessage(toNumber, text, uaSim, date = new Date()) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT @ua_sim_ref:= ua_sim.id_",
            "FROM ua_sim",
            "INNER JOIN ua ON ua.id_= ua_sim.ua",
            "WHERE",
            [
                `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                `ua.instance = ${esc(uaSim.ua.instance)}`,
                `ua.user_email= ${esc(uaSim.ua.userEmail)}`
            ].join(" AND "),
            ";",
            ""
        ].join("\n");
        sql += buildInsertQuery("message_toward_gsm", {
            "date": date.getTime(),
            "ua_sim": { "@": "ua_sim_ref" },
            "to_number": toNumber,
            "text": text,
            "send_date": null
        }, "THROW ERROR");
        yield exports.query(sql);
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
    return __awaiter(this, void 0, void 0, function* () {
        let bundledData = {
            "type": "MESSAGE",
            "pduDate": date
        };
        let sql = buildMessageTowardSipInsertQuery(true, fromNumber, text, date, bundledData, { "target": "ALL UA REGISTERED TO SIM", imsi });
        let queryResults = yield exports.query(sql);
        return queryResults[0].insertId !== 0;
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
    return __awaiter(this, void 0, void 0, function* () {
        let date = new Date();
        let bundledData = {
            "type": "MISSED CALL",
            date
        };
        let sql = buildMessageTowardSipInsertQuery(false, number, `Missed call`, date, bundledData, {
            "target": "ALL UA REGISTERED TO SIM",
            imsi
        });
        yield exports.query(sql);
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
function onCallAnswered(number, imsi, answeredByUa, ringingUas) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = "";
        let date = new Date();
        let bundledData = {
            "type": "CALL ANSWERED BY",
            date,
            "ua": answeredByUa
        };
        for (let ua of ringingUas) {
            if (ua.userEmail === answeredByUa.userEmail) {
                continue;
            }
            sql += buildMessageTowardSipInsertQuery(false, number, `Call answered by ${answeredByUa.userEmail}`, date, bundledData, {
                "target": "SPECIFIC UA REGISTERED TO SIM",
                "uaSim": { ua, imsi }
            });
        }
        if (!sql) {
            return;
        }
        yield exports.query(sql);
    });
}
exports.onCallAnswered = onCallAnswered;
/** Check if a ua registration have message pending */
function messageTowardSipUnsentCount(uaSim) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT COUNT(*) AS count",
            "FROM message_toward_sip",
            "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
            "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
            "INNER JOIN ua ON ua.id_= ua_sim.ua",
            "WHERE",
            [
                "ua_sim_message_toward_sip.delivered_date IS NULL",
                `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                `ua.instance= ${esc(uaSim.ua.instance)}`,
                `ua.user_email= ${esc(uaSim.ua.userEmail)}`
            ].join(" AND ")
        ].join("\n");
        return (yield exports.query(sql))[0]["count"];
    });
}
exports.messageTowardSipUnsentCount = messageTowardSipUnsentCount;
/** Return array of tuples [ MessageTowardSip, <method to set the message as received> ] */
function getUnsentMessagesTowardSip(uaSim) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT",
            "message_toward_sip.is_from_dongle,",
            "message_toward_sip.bundled_data,",
            "message_toward_sip.date,",
            "message_toward_sip.from_number,",
            "message_toward_sip.text,",
            "ua_sim_message_toward_sip.id_",
            "FROM message_toward_sip",
            "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
            "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
            "INNER JOIN ua ON ua.id_= ua_sim.ua",
            "WHERE",
            [
                "ua_sim_message_toward_sip.delivered_date IS NULL",
                `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                `ua.instance= ${esc(uaSim.ua.instance)}`,
                `ua.user_email= ${esc(uaSim.ua.userEmail)}`
            ].join(" AND "),
            "ORDER BY message_toward_sip.date"
        ].join("\n");
        let rows = yield exports.query(sql);
        let out = new Array();
        for (let row of rows) {
            let message = {
                "date": new Date(row["date"]),
                "fromNumber": row["from_number"],
                "isFromDongle": row["is_from_dongle"] === 1,
                "bundledData": JSON_CUSTOM.parse(row["bundled_data"]),
                "text": row["text"]
            };
            let onReceived = () => __awaiter(this, void 0, void 0, function* () {
                return yield exports.query(buildInsertQuery("ua_sim_message_toward_sip", {
                    "id_": row["id_"],
                    "delivered_date": Date.now()
                }, "UPDATE"));
            });
            out.push([message, onReceived]);
        }
        return out;
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
    return __awaiter(this, void 0, void 0, function* () {
        let rows = yield exports.query([
            "SELECT",
            "message_toward_gsm.id_,",
            "message_toward_gsm.date,",
            "message_toward_gsm.to_number,",
            "message_toward_gsm.text,",
            "ua_sim.imsi,",
            "ua.instance,",
            "ua.user_email,",
            "ua.platform,",
            "ua.push_token,",
            "ua.software",
            "FROM message_toward_gsm",
            "INNER JOIN ua_sim ON ua_sim.id_ = message_toward_gsm.ua_sim",
            "INNER JOIN ua ON ua.id_ = ua_sim.ua",
            `WHERE ua_sim.imsi=${esc(imsi)} AND message_toward_gsm.send_date IS NULL`,
            "ORDER BY message_toward_gsm.date",
            ";"
        ].join("\n"));
        let out = [];
        for (let row of rows) {
            let message = {
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
                "text": row["text"]
            };
            let message_toward_gsm_id_ = row["id_"];
            let setSentPr;
            out.push([
                message,
                {
                    "onSent": (sendDate) => __awaiter(this, void 0, void 0, function* () {
                        setSentPr = getUnsentMessagesTowardGsm.onSent(message_toward_gsm_id_, message, sendDate);
                        yield setSentPr;
                    }),
                    "onStatusReport": (statusReport) => __awaiter(this, void 0, void 0, function* () {
                        yield setSentPr;
                        yield getUnsentMessagesTowardGsm.onStatusReport(message_toward_gsm_id_, message, statusReport);
                    })
                }
            ]);
        }
        return out;
    });
}
exports.getUnsentMessagesTowardGsm = getUnsentMessagesTowardGsm;
(function (getUnsentMessagesTowardGsm) {
    const checkMark = Buffer.from("e29c94", "hex").toString("utf8");
    const crossMark = Buffer.from("e29d8c", "hex").toString("utf8");
    /**
     *
     * Set message toward sip as received in the db and create Send report
     *
     * sendDate correspond to the exact time the message have been sent by dongle,
     * null if send failed.
     *
    */
    function onSent(messageTowardGsm_id, messageTowardGsm, sendDate) {
        return __awaiter(this, void 0, void 0, function* () {
            let isSuccess = sendDate ? true : false;
            let sql = buildInsertQuery("message_toward_gsm", {
                "id_": messageTowardGsm_id,
                "send_date": isSuccess ? sendDate.getTime() : -1
            }, "UPDATE");
            let bundledData = {
                "type": "SEND REPORT",
                messageTowardGsm,
                sendDate,
            };
            sql += buildMessageTowardSipInsertQuery(false, messageTowardGsm.toNumber, isSuccess ? checkMark : crossMark, new Date(), bundledData, {
                "target": "SPECIFIC UA REGISTERED TO SIM",
                "uaSim": messageTowardGsm.uaSim
            });
            yield exports.query(sql);
        });
    }
    getUnsentMessagesTowardGsm.onSent = onSent;
    function onStatusReport(messageTowardGsm_id, messageTowardGsm, statusReport) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = "";
            //TODO: set send date and delivery date and not now!!!!!!
            //TODO: may be useless...depend of operator I assume
            if (isNaN(statusReport.dischargeDate.getTime())) {
                statusReport.dischargeDate = new Date();
            }
            ;
            let bundledData = {
                "type": "STATUS REPORT",
                messageTowardGsm,
                statusReport,
            };
            let now = new Date();
            let build = (text, target) => buildMessageTowardSipInsertQuery(false, messageTowardGsm.toNumber, text, now, bundledData, target);
            if (statusReport.isDelivered) {
                sql += build(`${checkMark}${checkMark}`, {
                    "target": "SPECIFIC UA REGISTERED TO SIM",
                    "uaSim": messageTowardGsm.uaSim
                });
                sql += build(`Me: ${messageTowardGsm.text}`, {
                    "target": "ALL OTHER UA OF USER REGISTERED TO SIM",
                    "uaSim": messageTowardGsm.uaSim
                });
                sql += build(`${messageTowardGsm.uaSim.ua.userEmail}: ${messageTowardGsm.text}`, {
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
            yield exports.query(sql);
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
    return __awaiter(this, void 0, void 0, function* () {
        let rows = yield exports.query([
            "SELECT",
            "ua_sim.imsi,",
            "MAX(message_toward_sip.date) AS last_received",
            "FROM ua_sim",
            "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
            "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
            "WHERE (message_toward_sip.is_from_dongle=1 OR message_toward_sip.is_from_dongle IS NULL)",
            "GROUP BY imsi"
        ].join("\n"));
        let result = {};
        for (let { imsi, last_received } of rows) {
            result[imsi] = new Date(last_received || 0);
        }
        return result;
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
function buildMessageTowardSipInsertQuery(isFromDongle, fromNumber, text, date, bundledData, target) {
    let sqlSelectionUaSim = [
        "FROM ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        "WHERE ua_sim.imsi= "
    ].join("\n");
    switch (target.target) {
        case "SPECIFIC UA REGISTERED TO SIM":
            sqlSelectionUaSim += [
                esc(target.uaSim.imsi),
                `ua.instance= ${esc(target.uaSim.ua.instance)}`,
                `ua.user_email= ${esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
        case "ALL UA REGISTERED TO SIM":
            sqlSelectionUaSim += `${esc(target.imsi)}`;
            break;
        case "ALL OTHER UA OF USER REGISTERED TO SIM":
            sqlSelectionUaSim += [
                esc(target.uaSim.imsi),
                `ua.instance <> ${esc(target.uaSim.ua.instance)}`,
                `ua.user_email= ${esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
        case "ALL UA OF OTHER USERS REGISTERED TO SIM":
            sqlSelectionUaSim += [
                esc(target.uaSim.imsi),
                `ua.user_email<> ${esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
    }
    let sql = [
        "INSERT INTO message_toward_sip ( is_from_dongle, bundled_data, date, from_number, text )",
        "SELECT",
        [
            mysqlCustom.bool.enc(isFromDongle),
            esc(JSON_CUSTOM.stringify(bundledData)),
            esc(date.getTime()),
            esc(fromNumber),
            esc(text)
        ].join(", "),
        sqlSelectionUaSim,
        "HAVING COUNT(*) <> 0",
        ";",
        "INSERT INTO ua_sim_message_toward_sip",
        "( ua_sim, message_toward_sip, delivered_date )",
        "SELECT ua_sim.id_, LAST_INSERT_ID(), NULL",
        sqlSelectionUaSim,
        ";",
        ""
    ].join("\n");
    return sql;
}
/**
 * Notify specific ua that the phone it's trying to reach is ringing.
 *
 * @param uaSim The uaSim that originated the call.
 * @param number The target phone number.
 *
 * (For now it only send to web ua)
 *
 *
 */
function onTargetGsmRinging(contact, number) {
    return __awaiter(this, void 0, void 0, function* () {
        if (contact.uaSim.ua.platform !== "web") {
            return;
        }
        let bundledData = {
            "type": "TARGET GSM RINGING"
        };
        let sql = buildMessageTowardSipInsertQuery(false, number, "( ringback )", new Date(), bundledData, {
            "target": "SPECIFIC UA REGISTERED TO SIM",
            "uaSim": contact.uaSim
        });
        yield exports.query(sql);
    });
}
exports.onTargetGsmRinging = onTargetGsmRinging;
