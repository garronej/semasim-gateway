import * as db from "../lib/db/asterisk";
import * as sipLibrary from "../tools/sipLibrary";
import * as types from "../lib/types";
import { assertSame } from "transfer-tools/dist/lib/testing";
import { cid } from "../lib/sipProxy/misc";

const contact: types.Contact = (() => {

    let imsi = "208150113995832";

    let ua: types.Ua = {
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
        "connectionId": cid.generate({ "remoteAddress": "82.12.123.2", "remotePort": 23292 }),
        "uaSim": { imsi, ua }
    };

})();

const psContact: types.PsContact = (() => {

    let contactAoR: sipLibrary.AoR = {
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
            "ua_instance": contactAoR!.params["+sip.instance"]!,
            "ua_userEmail": contactParams["user_email"]!,
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

export async function testDbAsterisk() {

    console.assert(types.misc.sanityChecks.contact(contact));

    await db.launch();

    await db.flush();

    db.query(
        db.buildInsertQuery(
            "ps_contacts",
            psContact,
            "THROW ERROR"
        )
    );

    assertSame(
        await db.evtNewContact.waitFor(10000),
        contact
    );

    db.deleteContact(contact);

    try {

        console.log("Last 3sec...");

        await db.evtExpiredContact.waitFor(3000);

        console.assert(false);

    } catch{ 

        console.log("...continue");

    }

    await db.query(
        db.buildInsertQuery(
            "ps_contacts",
            psContact,
            "THROW ERROR"
        )
    );

    db.query(`DELETE FROM ps_contacts WHERE id= ${db.esc(psContact.id)}`);

    assertSame(
        await db.evtExpiredContact.waitFor(10000),
        contact
    );

    let password = await db.createEndpointIfNeededAndGetPassword(contact.uaSim.imsi);

    let rows = await db.query(
        `SELECT * FROM ps_aors WHERE id= ${db.esc(contact.uaSim.imsi)}`
    );

    console.assert(rows.length === 1);

    rows= await db.query(`SELECT * FROM ps_auths WHERE id= ${db.esc(contact.uaSim.imsi)}`);

    console.assert(rows.length === 1);

    console.assert(rows[0]["username"] === contact.uaSim.imsi);

    console.assert(rows[0]["password"] === password);

    console.assert(
        await db.createEndpointIfNeededAndGetPassword(
            contact.uaSim.imsi
        ) === password
    );

    console.assert(
        await db.createEndpointIfNeededAndGetPassword(
            contact.uaSim.imsi,
            "RENEW PASSWORD"
        ) !== password
    );

    await db.flush();

    console.log("PASS ASTERISK");

}