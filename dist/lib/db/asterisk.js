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
const types = require("../types");
const mysqlCustom = require("../../tools/mysqlCustom");
const MySqlEvents_1 = require("../../tools/MySqlEvents");
const voiceCallBridge_1 = require("../voiceCallBridge");
const sipProxy_1 = require("../sipProxy");
const c = require("../_constants");
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        const connectionConfig = Object.assign({}, c.dbParamsGateway, { "database": "asterisk" });
        let api = yield mysqlCustom.connectAndGetApi(connectionConfig);
        yield api.query([
            "DELETE FROM ps_contacts",
            "WHERE endpoint LIKE '_______________'"
        ].join("\n"));
        yield MySqlEvents_1.MySqlEvents.launch(connectionConfig);
        let post = (row, evt) => evt.post(types.misc.buildContactFromPsContact(row));
        exports.evtNewContact = new ts_events_extended_1.SyncEvent();
        MySqlEvents_1.MySqlEvents.instance.evtNewRow.attach(({ table }) => table === "ps_contacts", ({ row }) => post(row, exports.evtNewContact));
        exports.evtExpiredContact = new ts_events_extended_1.SyncEvent();
        MySqlEvents_1.MySqlEvents.instance.evtDeleteRow.attach(({ table }) => table === "ps_contacts", ({ row }) => post(row, exports.evtExpiredContact));
        exports.query = api.query;
        exports.esc = api.esc;
        exports.buildInsertQuery = api.buildInsertQuery;
    });
}
exports.launch = launch;
/** for test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "DELETE FROM ps_aors;",
            "DELETE FROM ps_auths;",
            "DELETE FROM ps_contacts;",
            "DELETE FROM ps_endpoints;",
        ].join("\n");
        yield exports.query(sql);
    });
}
exports.flush = flush;
function deleteContact(contact) {
    return new Promise((resolve, reject) => {
        //TODO: this crash some times for some reasons
        let timerId = setTimeout(() => reject(new Error(`Delete contact timeout error`)), 3000);
        let queryPromise = (() => __awaiter(this, void 0, void 0, function* () {
            let { affectedRows } = yield exports.query(`DELETE FROM ps_contacts WHERE id=${exports.esc(contact.id)}`);
            let isDeleted = affectedRows ? true : false;
            if (!isDeleted) {
                exports.evtExpiredContact.detach(timerId);
                clearTimeout(timerId);
                resolve(false);
            }
        }))();
        exports.evtExpiredContact.attachOnceExtract(({ id }) => id === contact.id, timerId, deletedContact => queryPromise.then(() => {
            clearTimeout(timerId);
            resolve(true);
        }));
    });
}
exports.deleteContact = deleteContact;
function createEndpointIfNeededAndGetPassword(imsi, renewPassword = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = "";
        sql += exports.buildInsertQuery("ps_aors", {
            "id": imsi,
            "max_contacts": 12,
            "qualify_frequency": 0,
            "support_path": "yes"
        }, "IGNORE");
        sql += [
            "INSERT INTO ps_auths ( id, auth_type, username, password, realm )",
            `VALUES( ${exports.esc(imsi)}, 'userpass', ${exports.esc(imsi)}, MD5(RAND()), 'semasim' )`,
            "ON DUPLICATE KEY UPDATE",
            renewPassword ? "password= VALUES(password)" : "id=id",
            ";",
            ""
        ].join("\n");
        /*
            "subscribe_context": null,
            "force_rport": null,
            "direct_media": null,
            "asymmetric_rtp_codec": null,
            "rtcp_mux": null,
            "direct_media_method": null,
            "connected_line_method": null,
            "callerid_tag": null
        */
        /*
        //For webRTC:
        sql += buildInsertQuery("ps_endpoints", {
            "id": imsi,
            "disallow": "all",
            "allow": "opus,alaw,ulaw",
            "use_avpf": "yes",
            "media_encryption": "dtls",
            "dtls_ca_file": "/etc/asterisk/keys/ca.crt",
            "dtls_cert_file": "/etc/asterisk/keys/asterisk.pem",
            "dtls_verify": "fingerprint",
            "dtls_setup": "actpass",
            "media_use_received_transport": "yes",
            "rtcp_mux": "yes",
            "context": sipCallContext,
            "message_context": messages_dialplanContext,
            "aors": imsi,
            "auth": imsi,
            "from_domain": c.domain,
            "ice_support": "yes",
            "transport": "transport-tcp"
        }, "IGNORE");
        */
        //For Linphone:
        sql += exports.buildInsertQuery("ps_endpoints", {
            "id": imsi,
            "disallow": "all",
            "allow": "alaw,ulaw",
            //"allow": "opus",
            "use_avpf": null,
            "media_encryption": null,
            "dtls_ca_file": null,
            "dtls_verify": null,
            "dtls_setup": null,
            "media_use_received_transport": null,
            "rtcp_mux": null,
            "context": voiceCallBridge_1.sipCallContext,
            "message_context": sipProxy_1.messagesDialplanContext,
            "aors": imsi,
            "auth": imsi,
            "from_domain": c.domain,
            "ice_support": "yes",
            "transport": "transport-tcp",
        }, "IGNORE");
        sql += `SELECT password FROM ps_auths WHERE id= ${exports.esc(imsi)}`;
        let { password } = (yield exports.query(sql)).pop()[0];
        return password;
    });
}
exports.createEndpointIfNeededAndGetPassword = createEndpointIfNeededAndGetPassword;
