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
const db = require("../lib/db/asterisk");
const sipLibrary = require("../tools/sipLibrary");
const types = require("../lib/types");
const testing_1 = require("transfer-tools/dist/lib/testing");
const misc_1 = require("../lib/sipProxy/misc");
const contact = (() => {
    let imsi = "208150113995832";
    let ua = {
        "instance": "\"<urn:uuid:a98eef4a-5a6d-41ca-8918-e1ef1819fec0>\"",
        "userEmail": "joseph.garrone.gh@gmail.com",
        "platform": "android",
        "pushToken": [
            "f_l7SPs6o7A:APA91bF_c0VGlz3pQPwrgpFe9U0FRzc",
            "VXlDmG97jt3DTzOlsjbUzsent-yeEz_QpQNhdO3Mbr-",
            "4-XxcSmyKj_Hr-XY_-LefF3RhHsSekVsSeYN95PAtwR",
            "Cpz-i1ytnc5DyMY8je4n69G"
        ].join(""),
        "software": "LinphoneAndroid/3.2.8 (belle-sip/1.6.3)"
    };
    return {
        "id": "__generated_by_asterisk__",
        "uri": [
            `sip:${imsi}@192.168.1.15:35096;`,
            "app-id=851039092461;",
            "pn-type=firebase;",
            `pn-tok=${ua.pushToken};`,
            `user_email=${ua.userEmail};`,
            "pn-silent=1;transport=tls"
        ].join(""),
        "path": "<sip:192.168.0.20:54632;transport=TCP;lr>,  <sip:172.31.18.20:80;transport=TLS;lr>",
        "connectionId": misc_1.cid.generate({ "remoteAddress": "82.12.123.2", "remotePort": 23292 }),
        "uaSim": { imsi, ua }
    };
})();
const psContact = (() => {
    let contactAoR = {
        "name": undefined,
        "uri": contact.uri,
        "params": {
            "+sip.instance": contact.uaSim.ua.instance
        }
    };
    contact.uri = (() => {
        let parsedUri = sipLibrary.parseUri(contact.uri);
        parsedUri.params = {};
        return sipLibrary.stringifyUri(parsedUri);
    })();
    let contactParams = sipLibrary.parseUri(contactAoR.uri).params;
    return {
        "id": contact.id,
        "uri": (() => {
            let parsedUri = sipLibrary.parseUri(contactAoR.uri);
            parsedUri.params = {};
            return sipLibrary.stringifyUri(parsedUri);
        })(),
        "path": contact.path,
        "endpoint": contact.uaSim.imsi,
        "user_agent": types.misc.smuggleMiscInPsContactUserAgent({
            "ua_instance": contactAoR.params["+sip.instance"],
            "ua_userEmail": contactParams["user_email"],
            "ua_platform": (() => {
                switch (contactParams["pn-type"]) {
                    case "google":
                    case "firebase": return "android";
                    case "apple": return "iOS";
                    default: return "other";
                }
            })(),
            "ua_pushToken": contactParams["pn-tok"] || "",
            "ua_software": contact.uaSim.ua.software,
            "connectionId": contact.connectionId
        })
    };
})();
function testDbAsterisk() {
    return __awaiter(this, void 0, void 0, function* () {
        console.assert(types.misc.sanityChecks.contact(contact));
        yield db.launch();
        yield db.flush();
        db.query(db.buildInsertQuery("ps_contacts", psContact, "THROW ERROR"));
        testing_1.assertSame(yield db.evtNewContact.waitFor(10000), contact);
        db.deleteContact(contact);
        try {
            console.log("Last 3sec...");
            yield db.evtExpiredContact.waitFor(3000);
            console.assert(false);
        }
        catch (_a) {
            console.log("...continue");
        }
        yield db.query(db.buildInsertQuery("ps_contacts", psContact, "THROW ERROR"));
        db.query(`DELETE FROM ps_contacts WHERE id= ${db.esc(psContact.id)}`);
        testing_1.assertSame(yield db.evtExpiredContact.waitFor(10000), contact);
        let password = yield db.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi);
        let rows = yield db.query(`SELECT * FROM ps_aors WHERE id= ${db.esc(contact.uaSim.imsi)}`);
        console.assert(rows.length === 1);
        rows = yield db.query(`SELECT * FROM ps_auths WHERE id= ${db.esc(contact.uaSim.imsi)}`);
        console.assert(rows.length === 1);
        console.assert(rows[0]["username"] === contact.uaSim.imsi);
        console.assert(rows[0]["password"] === password);
        console.assert((yield db.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi)) === password);
        console.assert((yield db.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi, "RENEW PASSWORD")) !== password);
        yield db.flush();
        console.log("PASS ASTERISK");
    });
}
exports.testDbAsterisk = testDbAsterisk;
