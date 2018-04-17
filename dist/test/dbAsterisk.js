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
const db_1 = require("../lib/db");
const types = require("../lib/types");
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
function testDbAsterisk() {
    return __awaiter(this, void 0, void 0, function* () {
        console.assert(types.misc.sanityChecks.contact(contact));
        yield db_1.asterisk.launch();
        yield db_1.asterisk.flush();
        let password = yield db_1.asterisk.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi);
        let rows = yield db_1.asterisk.query(`SELECT * FROM ps_aors WHERE id= ${db_1.asterisk.esc(contact.uaSim.imsi)}`);
        console.assert(rows.length === 1);
        rows = yield db_1.asterisk.query(`SELECT * FROM ps_auths WHERE id= ${db_1.asterisk.esc(contact.uaSim.imsi)}`);
        console.assert(rows.length === 1);
        console.assert(rows[0]["username"] === contact.uaSim.imsi);
        console.assert(rows[0]["password"] === password);
        console.assert((yield db_1.asterisk.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi)) === password);
        console.assert((yield db_1.asterisk.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi, "RENEW PASSWORD")) !== password);
        yield db_1.asterisk.flush();
        console.log("PASS ASTERISK");
    });
}
exports.testDbAsterisk = testDbAsterisk;
if (require.main === module) {
    console.log("Run standalone");
    require("rejection-tracker").main(__dirname, "..", "..");
    testDbAsterisk().then(() => process.exit(0));
}
