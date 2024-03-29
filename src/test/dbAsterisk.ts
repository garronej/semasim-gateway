import * as db from "../lib/dbAsterisk";
import * as types from "../lib/types";
import { sanityChecks } from "../lib/misc/sanityChecks";
import * as sipRouting from "../lib/misc/sipRouting"
import * as assert from "assert";
import * as crypto from "crypto";

const contact: types.Contact = (() => {

    let imsi = "208150113995832";

    let ua: types.Ua = {
        "instance": "\"<urn:uuid:a98eef4a-5a6d-41ca-8918-e1ef1819fec0>\"",
        "userEmail": "joseph.garrone.gh@gmail.com",
        "towardUserEncryptKeyStr": crypto.randomBytes(254).toString("binary"),
        "platform": "android",
        "pushToken": [
            "f_l7SPs6o7A:APA91bF_c0VGlz3pQPwrgpFe9U0FRzc",
            "VXlDmG97jt3DTzOlsjbUzsent-yeEz_QpQNhdO3Mbr-",
            "4-XxcSmyKj_Hr-XY_-LefF3RhHsSekVsSeYN95PAtwR",
            "Cpz-i1ytnc5DyMY8je4n69G"
        ].join("")
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
        "connectionId": sipRouting.cid.generate({ "remoteAddress": "82.12.123.2", "remotePort": 23292 }),
        "uaSim": { imsi, ua }
    };

})();

export async function testDbAsterisk() {

    assert(sanityChecks.contact(contact));

    await db.launch();

    await db.flush();

    const password= await db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(
        contact.uaSim.imsi
    );

    let rows = await db.queryRetryUntilSuccess(
        ()=> `SELECT * FROM ps_aors WHERE id= ${db.esc(contact.uaSim.imsi)}`
    );

    assert(rows.length === 1);

    rows= await db.queryRetryUntilSuccess(()=>`SELECT * FROM ps_auths WHERE id= ${db.esc(contact.uaSim.imsi)}`);

    assert(rows.length === 1);

    assert(rows[0]["username"] === contact.uaSim.imsi);

    assert(rows[0]["password"] === password);

    assert(
        password 
        ===
        await db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(
            contact.uaSim.imsi
        )
    );

    const newPassword= db.generateSipEndpointPassword();

    assert(
        await db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(
            contact.uaSim.imsi,
            newPassword
        ) === newPassword
    );

    await db.flush();

    console.log("PASS ASTERISK");

}


if (require.main === module) {

    console.log("Run standalone");

    process.once("unhandledRejection", error => { throw error; });

    testDbAsterisk().then(() => process.exit(0));

}