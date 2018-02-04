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
const ts_events_extended_1 = require("ts-events-extended");
const sipContact_1 = require("./sipContact");
const f = require("../tools/mySqlFunctions");
const MySqlEvents_1 = require("../tools/MySqlEvents");
const _constants_1 = require("./_constants");
const _debug = require("debug");
let debug = _debug("_db");
var asterisk;
(function (asterisk) {
    const connectionConfig = Object.assign({}, _constants_1.c.dbParamsGateway, { "database": "asterisk" });
    /** is exported only for tests */
    _a = f.getUtils(connectionConfig), asterisk.query = _a.query, asterisk.esc = _a.esc, asterisk.buildInsertQuery = _a.buildInsertQuery;
    /** for test purpose only */
    function flush() {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = [
                "DELETE FROM ps_aors;",
                "DELETE FROM ps_auths;",
                "DELETE FROM ps_contacts;",
                "DELETE FROM ps_endpoints;",
            ].join("\n");
            yield asterisk.query(sql);
        });
    }
    asterisk.flush = flush;
    asterisk.evtNewContact = new ts_events_extended_1.SyncEvent();
    asterisk.evtExpiredContact = new ts_events_extended_1.SyncEvent();
    function startListeningPsContacts() {
        return __awaiter(this, void 0, void 0, function* () {
            yield asterisk.query([
                "DELETE FROM ps_contacts",
                "WHERE endpoint LIKE '_______________'"
            ].join("\n"));
            yield MySqlEvents_1.MySqlEvents.initialize(connectionConfig);
            MySqlEvents_1.MySqlEvents.instance.evtNewRow.attach(({ database, table }) => (database === connectionConfig.database &&
                table === "ps_contacts"), ({ row }) => __awaiter(this, void 0, void 0, function* () {
                let { id, endpoint, path, uri, user_agent } = row;
                let psContact = { id, endpoint, path, uri, user_agent };
                let contact = sipContact_1.PsContact.buildContact(psContact);
                asterisk.evtNewContact.post(contact);
            }));
            MySqlEvents_1.MySqlEvents.instance.evtDeleteRow.attach(({ database, table }) => (database === connectionConfig.database &&
                table === "ps_contacts"), ({ row }) => __awaiter(this, void 0, void 0, function* () {
                let { id, endpoint, path, uri, user_agent } = row;
                let psContact = { id, endpoint, path, uri, user_agent };
                let contact = sipContact_1.PsContact.buildContact(psContact);
                asterisk.evtExpiredContact.post(contact);
            }));
        });
    }
    asterisk.startListeningPsContacts = startListeningPsContacts;
    function deleteContact(contact) {
        return new Promise((resolve, reject) => {
            //TODO: this crash some times for some reasons
            let timerId = setTimeout(() => reject(new Error(`Delete contact timeout error`)), 3000);
            let queryPromise = (() => __awaiter(this, void 0, void 0, function* () {
                let { affectedRows } = yield asterisk.query(`DELETE FROM ps_contacts WHERE id=${asterisk.esc(contact.id)}`);
                let isDeleted = affectedRows ? true : false;
                if (!isDeleted) {
                    asterisk.evtExpiredContact.detach(timerId);
                    clearTimeout(timerId);
                    resolve(false);
                }
            }))();
            asterisk.evtExpiredContact.attachOnceExtract(({ id }) => id === contact.id, timerId, deletedContact => queryPromise.then(() => {
                clearTimeout(timerId);
                resolve(true);
            }));
        });
    }
    asterisk.deleteContact = deleteContact;
    function createEndpointIfNeededAndGetPassword(imsi, renewPassword = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = "";
            sql += asterisk.buildInsertQuery("ps_aors", {
                "id": imsi,
                "max_contacts": 12,
                "qualify_frequency": 0,
                "support_path": "yes"
            }, "IGNORE");
            sql += [
                "INSERT INTO ps_auths ( id, auth_type, username, password, realm )",
                `VALUES( ${asterisk.esc(imsi)}, 'userpass', ${asterisk.esc(imsi)}, MD5(RAND()), 'semasim' )`,
                "ON DUPLICATE KEY UPDATE",
                renewPassword ? "password= VALUES(password)" : "id=id",
                ";",
                ""
            ].join("\n");
            sql += asterisk.buildInsertQuery("ps_endpoints", {
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
            sql += `SELECT password FROM ps_auths WHERE id= ${asterisk.esc(imsi)}`;
            let { password } = (yield asterisk.query(sql)).pop()[0];
            return password;
        });
    }
    asterisk.createEndpointIfNeededAndGetPassword = createEndpointIfNeededAndGetPassword;
    var _a;
})(asterisk = exports.asterisk || (exports.asterisk = {}));
var semasim;
(function (semasim) {
    _a = f.getUtils(Object.assign({}, _constants_1.c.dbParamsGateway, { "database": "semasim" }), "HANDLE STRING ENCODING"), semasim.query = _a.query, semasim.esc = _a.esc, semasim.buildInsertQuery = _a.buildInsertQuery;
    /** Only for test purpose */
    function flush() {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = [
                "DELETE FROM ua;",
                "DELETE FROM message_toward_sip;"
            ].join("\n");
            yield semasim.query(sql);
        });
    }
    semasim.flush = flush;
    function addUaSim(uaSim) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = "";
            let { imsi, ua } = uaSim;
            sql += semasim.buildInsertQuery("ua", {
                "instance": ua.instance,
                "user_email": ua.userEmail,
                "platform": ua.platform,
                "push_token": ua.pushToken,
                "software": ua.software
            }, "UPDATE");
            sql += [
                "SELECT @ua_ref:=ua.id_",
                "FROM ua",
                `WHERE instance= ${semasim.esc(ua.instance)} AND user_email= ${semasim.esc(ua.userEmail)}`,
                ";",
                ""
            ].join("\n");
            sql += semasim.buildInsertQuery("ua_sim", {
                "ua": { "@": "ua_ref" },
                imsi
            }, "IGNORE");
            sql += [
                `SELECT COUNT(*) as sim_ua_count`,
                "FROM ua_sim",
                `WHERE imsi= ${semasim.esc(imsi)}`
            ].join("\n");
            let queryResults = yield semasim.query(sql);
            return {
                "isUaCreatedOrUpdated": queryResults[0].insertId !== 0,
                "isFirstUaForSim": (queryResults[2].insertId !== 0 &&
                    queryResults[3][0]["sim_ua_count"] === 1)
            };
        });
    }
    semasim.addUaSim = addUaSim;
    //TODO: test!
    function removeUaSim(imsi, uasToKeep = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let cond = uasToKeep.length ? [
                " AND NOT ( ",
                uasToKeep.map(ua => `ua.instance= ${semasim.esc(ua.instance)} AND ua.user_email= ${semasim.esc(ua.userEmail)}`).join(" OR "),
                " )"
            ].join("") : "";
            yield semasim.query([
                "DELETE ua_sim.*",
                "FROM ua_sim",
                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                `WHERE ua_sim.imsi= ${semasim.esc(imsi)}${cond}`
            ].join("\n"));
        });
    }
    semasim.removeUaSim = removeUaSim;
    ;
    let MessageTowardGsm;
    (function (MessageTowardGsm) {
        function add(toNumber, text, uaSim) {
            return __awaiter(this, void 0, void 0, function* () {
                let sql = "";
                sql += [
                    "SELECT @ua_sim_ref:= ua_sim.id_",
                    "FROM ua_sim",
                    "INNER JOIN ua ON ua.id_= ua_sim.ua",
                    "WHERE",
                    [
                        `ua_sim.imsi= ${semasim.esc(uaSim.imsi)}`,
                        `ua.instance = ${semasim.esc(uaSim.ua.instance)}`,
                        `ua.user_email= ${semasim.esc(uaSim.ua.userEmail)}`
                    ].join(" AND "),
                    ";",
                    ""
                ].join("\n");
                sql += semasim.buildInsertQuery("message_toward_gsm", {
                    "date": Date.now(),
                    "ua_sim": { "@": "ua_sim_ref" },
                    "to_number": toNumber,
                    "text": text,
                    "send_date": null
                }, "THROW ERROR");
                yield semasim.query(sql);
            });
        }
        MessageTowardGsm.add = add;
        function getUnsent(imsi) {
            return __awaiter(this, void 0, void 0, function* () {
                let rows = yield semasim.query([
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
                    `WHERE ua_sim.imsi=${semasim.esc(imsi)} AND message_toward_gsm.send_date IS NULL`,
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
                    let confirm = {
                        "setSent": (sentDate) => __awaiter(this, void 0, void 0, function* () {
                            return yield semasim.query(semasim.buildInsertQuery("message_toward_gsm", {
                                "id_": message_toward_gsm_id_,
                                "send_date": sentDate ? sentDate.getTime() : -1
                            }, "UPDATE"));
                        }),
                        "setStatusReport": (statusReport) => __awaiter(this, void 0, void 0, function* () {
                            return yield semasim.query(semasim.buildInsertQuery("message_toward_gsm_status_report", {
                                "message_toward_gsm": message_toward_gsm_id_,
                                "is_delivered": statusReport.isDelivered ? 1 : 0,
                                "discharge_date": isNaN(statusReport.dischargeDate.getTime()) ?
                                    null : statusReport.dischargeDate.getTime(),
                                "status": statusReport.status
                            }, "UPDATE"));
                        })
                    };
                    out.push([message, confirm]);
                }
                return out;
            });
        }
        MessageTowardGsm.getUnsent = getUnsent;
    })(MessageTowardGsm = semasim.MessageTowardGsm || (semasim.MessageTowardGsm = {}));
    function lastMessageReceivedDateBySim() {
        return __awaiter(this, void 0, void 0, function* () {
            let rows = yield semasim.query([
                "SELECT",
                "ua_sim.imsi,",
                "MAX(message_toward_sip.date) AS last_received",
                "FROM ua_sim",
                "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
                "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
                "WHERE (message_toward_sip.is_report=0 OR message_toward_sip.is_report IS NULL)",
                "GROUP BY imsi"
            ].join("\n"));
            let result = {};
            for (let { imsi, last_received } of rows) {
                result[imsi] = new Date(last_received || 0);
            }
            return result;
        });
    }
    semasim.lastMessageReceivedDateBySim = lastMessageReceivedDateBySim;
    let MessageTowardSip;
    (function (MessageTowardSip) {
        /** return true if message_toward_sip added */
        function add(fromNumber, text, date, isReport, target) {
            return __awaiter(this, void 0, void 0, function* () {
                let sqlSelectionUaSim = [
                    "FROM ua_sim",
                    "INNER JOIN ua ON ua.id_= ua_sim.ua",
                    "WHERE ua_sim.imsi= "
                ].join("\n");
                switch (target.target) {
                    case "SPECIFIC UA REGISTERED TO SIM":
                        sqlSelectionUaSim += [
                            `${semasim.esc(target.uaSim.imsi)}`,
                            `ua.instance= ${semasim.esc(target.uaSim.ua.instance)}`,
                            `ua.user_email= ${semasim.esc(target.uaSim.ua.userEmail)}`
                        ].join(" AND ");
                        break;
                    case "ALL UA REGISTERED TO SIM":
                        sqlSelectionUaSim += `${semasim.esc(target.imsi)}`;
                        break;
                    case "ALL OTHER UA OF USER REGISTERED TO SIM":
                        sqlSelectionUaSim += [
                            `${semasim.esc(target.uaSim.imsi)}`,
                            `ua.instance <> ${semasim.esc(target.uaSim.ua.instance)}`,
                            `ua.user_email= ${semasim.esc(target.uaSim.ua.userEmail)}`
                        ].join(" AND ");
                        break;
                    case "ALL UA OF OTHER USERS REGISTERED TO SIM":
                        sqlSelectionUaSim += [
                            `${semasim.esc(target.uaSim.imsi)}`,
                            `ua.user_email<> ${semasim.esc(target.uaSim.ua.userEmail)}`
                        ].join(" AND ");
                        break;
                }
                let queryResults = yield semasim.query([
                    "INSERT INTO message_toward_sip ( is_report, date, from_number, text )",
                    "SELECT",
                    [
                        semasim.esc(isReport ? 1 : 0),
                        semasim.esc(date.getTime()),
                        semasim.esc(fromNumber),
                        semasim.esc(text)
                    ].join(", "),
                    sqlSelectionUaSim,
                    "HAVING COUNT(*) <> 0",
                    ";",
                    "INSERT INTO ua_sim_message_toward_sip",
                    "( ua_sim, message_toward_sip, delivered_date )",
                    "SELECT ua_sim.id_, LAST_INSERT_ID(), NULL",
                    sqlSelectionUaSim
                ].join("\n"));
                return queryResults[0].insertId !== 0;
            });
        }
        MessageTowardSip.add = add;
        function unsentCount(uaSim) {
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
                        `ua_sim.imsi= ${semasim.esc(uaSim.imsi)}`,
                        `ua.instance= ${semasim.esc(uaSim.ua.instance)}`,
                        `ua.user_email= ${semasim.esc(uaSim.ua.userEmail)}`
                    ].join(" AND ")
                ].join("\n");
                return (yield semasim.query(sql))[0]["count"];
            });
        }
        MessageTowardSip.unsentCount = unsentCount;
        /** Return array of [ MessageTowardSip, setDelivered ] */
        function getUnsent(uaSim) {
            return __awaiter(this, void 0, void 0, function* () {
                let sql = [
                    `SELECT`,
                    `message_toward_sip.is_report,`,
                    `message_toward_sip.date,`,
                    `message_toward_sip.from_number,`,
                    `message_toward_sip.text,`,
                    `ua_sim_message_toward_sip.id_`,
                    `FROM message_toward_sip`,
                    `INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_`,
                    `INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim`,
                    `INNER JOIN ua ON ua.id_= ua_sim.ua`,
                    "WHERE",
                    [
                        "ua_sim_message_toward_sip.delivered_date IS NULL",
                        `ua_sim.imsi= ${semasim.esc(uaSim.imsi)}`,
                        `ua.instance= ${semasim.esc(uaSim.ua.instance)}`,
                        `ua.user_email= ${semasim.esc(uaSim.ua.userEmail)}`
                    ].join(" AND "),
                    `ORDER BY message_toward_sip.date`
                ].join("\n");
                let rows = yield semasim.query(sql);
                let out = new Array();
                for (let row of rows) {
                    let message = {
                        "date": new Date(row["date"]),
                        "fromNumber": row["from_number"],
                        "isReport": row["is_report"] === 1,
                        "text": row["text"]
                    };
                    let setReceived = () => __awaiter(this, void 0, void 0, function* () {
                        return yield semasim.query(semasim.buildInsertQuery("ua_sim_message_toward_sip", {
                            "id_": row["id_"],
                            "delivered_date": Date.now()
                        }, "UPDATE"));
                    });
                    out.push([message, setReceived]);
                }
                return out;
            });
        }
        MessageTowardSip.getUnsent = getUnsent;
    })(MessageTowardSip = semasim.MessageTowardSip || (semasim.MessageTowardSip = {}));
    var _a;
})(semasim = exports.semasim || (exports.semasim = {}));
