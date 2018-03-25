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
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.query([
            "DELETE FROM ps_contacts",
            `WHERE uri=${exports.esc(contact.uri.replace(/;/g, "^3B"))}`
        ].join("\n"));
    });
}
exports.deleteContact = deleteContact;
function createEndpointIfNeededAndGetPassword(imsi, renewPassword = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = "";
        sql += [
            "INSERT INTO ps_auths ( id, auth_type, username, password, realm )",
            `VALUES( ${exports.esc(imsi)}, 'userpass', ${exports.esc(imsi)}, MD5(RAND()), 'semasim' )`,
            "ON DUPLICATE KEY UPDATE",
            renewPassword ? "password= VALUES(password)" : "id=id",
            ";",
            ""
        ].join("\n");
        let ps_endpoints_base = {
            "disallow": "all",
            "context": voiceCallBridge_1.sipCallContext,
            "message_context": sipProxy_1.messagesDialplanContext,
            "auth": imsi,
            "from_domain": c.domain,
            "ice_support": "yes",
            "transport": "transport-tcp"
        };
        let ps_endpoints_web = (() => {
            let name = `${imsi}-webRTC`;
            return Object.assign({ "id": name, "aors": name }, ps_endpoints_base, { "allow": "opus,alaw,ulaw", 
                //"allow": "alaw,ulaw",
                "use_avpf": "yes", "media_encryption": "dtls", "dtls_ca_file": "/etc/asterisk/keys/ca.crt", "dtls_cert_file": "/etc/asterisk/keys/asterisk.pem", "dtls_verify": "fingerprint", "dtls_setup": "actpass", "media_use_received_transport": "yes", "rtcp_mux": "yes" });
        })();
        let ps_endpoints_mobile = Object.assign({ "id": imsi, "aors": imsi }, ps_endpoints_base, { "allow": "alaw,ulaw" });
        for (let ps_endpoints of [ps_endpoints_mobile, ps_endpoints_web]) {
            sql += exports.buildInsertQuery("ps_aors", {
                "id": ps_endpoints.aors,
                "max_contacts": 30,
                "qualify_frequency": 0,
                "support_path": "yes"
            }, "IGNORE");
            sql += exports.buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");
        }
        sql += `SELECT password FROM ps_auths WHERE id= ${exports.esc(imsi)}`;
        let { password } = (yield exports.query(sql)).pop()[0];
        return password;
    });
}
exports.createEndpointIfNeededAndGetPassword = createEndpointIfNeededAndGetPassword;
