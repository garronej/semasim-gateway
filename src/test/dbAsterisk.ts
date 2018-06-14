import { asterisk as db } from "../lib/db";
import * as types from "../lib/types";
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

export async function testDbAsterisk() {

    console.assert(types.misc.sanityChecks.contact(contact));

    await db.launch();

    await db.flush();

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


if (require.main === module) {

    console.log("Run standalone");

    process.once("unhandledRejection", error => { throw error; });

    testDbAsterisk().then(() => process.exit(0));

}