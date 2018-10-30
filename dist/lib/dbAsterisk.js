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
const sqliteCustom = require("sqlite-custom");
const md5 = require("md5");
const i = require("../bin/installer");
const voiceCallBridge_1 = require("./voiceCallBridge");
const sipMessagesMonitor_1 = require("./sipMessagesMonitor");
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = () => Promise.resolve();
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        let api = yield sqliteCustom.connectAndGetApi(i.ast_db_path);
        yield api.query("DELETE FROM ps_contacts");
        exports.query = api.query;
        exports.esc = api.esc;
        exports.buildInsertQuery = api.buildInsertQuery;
        exports.buildInsertOrUpdateQueries = api.buildInsertOrUpdateQueries;
        beforeExit.impl = () => api.close();
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
/** Helper function to generate a sip password */
function generateSipEndpointPassword() {
    return md5(`${Math.random()}`);
}
exports.generateSipEndpointPassword = generateSipEndpointPassword;
/**
 *
 * If endpoint does not exist it is created.
 * If no password was provided one is generated.
 *
 * If endpoint does exist and a password is
 * provided then the old password is replaced
 * by the one provided.
 * If no password was provided nothing is updated.
 *
 * return the current password
 *
 *
 */
function createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = "";
        {
            const table = "ps_auths";
            const values = {
                "id": imsi,
                "auth_type": "userpass",
                "username": imsi,
                "realm": "semasim"
            };
            if (newPassword !== undefined) {
                values["password"] = newPassword;
                sql += exports.buildInsertOrUpdateQueries(table, values, ["id"]);
            }
            else {
                values["password"] = generateSipEndpointPassword();
                sql += exports.buildInsertQuery(table, values, "IGNORE");
            }
        }
        const [ps_endpoints_web, ps_endpoints_mobile] = (() => {
            const ps_endpoints_base = {
                "disallow": "all",
                "allow": "alaw,ulaw",
                "context": voiceCallBridge_1.sipCallContext,
                "message_context": sipMessagesMonitor_1.dialplanContext,
                "auth": imsi,
                "from_domain": i.getBaseDomain(),
                "ice_support": "yes",
                "transport": "transport-tcp",
                "dtmf_mode": "info"
            };
            const webId = `${imsi}-webRTC`;
            return [Object.assign({ "id": webId, "aors": webId }, ps_endpoints_base, { "use_avpf": "yes", "media_encryption": "dtls", "dtls_ca_file": i.ca_crt_path, "dtls_cert_file": i.host_pem_path, "dtls_verify": "fingerprint", "dtls_setup": "actpass", "media_use_received_transport": "yes", "rtcp_mux": "yes" }), Object.assign({ "id": imsi, "aors": imsi }, ps_endpoints_base)];
        })();
        for (const ps_endpoints of [ps_endpoints_mobile, ps_endpoints_web]) {
            sql += exports.buildInsertQuery("ps_aors", {
                "id": ps_endpoints.aors,
                "max_contacts": 30,
                "qualify_frequency": 0,
                "support_path": "yes"
            }, "IGNORE");
            sql += exports.buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");
        }
        sql += `SELECT password FROM ps_auths WHERE id= ${exports.esc(imsi)}`;
        const { password } = (yield exports.query(sql)).pop()[0];
        return password;
    });
}
exports.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword = createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword;
