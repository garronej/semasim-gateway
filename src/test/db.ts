require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact, PsContact } from "../lib/sipContact";
import * as db from "../lib/db";
import * as f from "../tools/mySqlFunctions";
import { MySqlEvents } from "../tools/MySqlEvents";
import * as sipLibrary from "../tools/sipLibrary";
import * as genSamples from "./genSamples";

(async () => {

    await testDbAsterisk();
    await testDbSemasim();

    console.log("ALL TESTS PASSED");

    process.exit(0);

})();

async function testDbAsterisk() {

    let imsi = "208150113995832";
    let token = [
        "f_l7SPs6o7A:APA91bF_c0VGlz3pQPwrgpFe9U0FRzc",
        "VXlDmG97jt3DTzOlsjbUzsent-yeEz_QpQNhdO3Mbr-",
        "4-XxcSmyKj_Hr-XY_-LefF3RhHsSekVsSeYN95PAtwR",
        "Cpz-i1ytnc5DyMY8je4n69G"
    ].join("");
    let instance= "\"<urn:uuid:a98eef4a-5a6d-41ca-8918-e1ef1819fec0>\"";
    let email = "joseph.garrone.gj@gmail.com";
    let software= "LinphoneAndroid/3.2.8 (belle-sip/1.6.3)";

    let psContact: PsContact = (() => {

        let contactAoR: sipLibrary.AoR = {
            "name": undefined,
            "uri": [
                `sip:${imsi}@192.168.1.15:35096;`,
                "app-id=851039092461;",
                "pn-type=firebase;",
                `pn-tok=${token};`,
                `user_email=${email};`,
                "pn-silent=1;transport=tls"
            ].join(""),
            "params": {
                "+sip.instance": instance
            }
        };

        let contactParams = sipLibrary.parseUri(contactAoR.uri).params;

        return {
            "id": "__generated_by_asterisk__",
            "uri": (() => {

                let parsedUri = sipLibrary.parseUri(contactAoR.uri);

                parsedUri.params = {};

                return sipLibrary.stringifyUri(parsedUri);

            })(),
            "path": "<sip:192.168.0.20:54632;transport=TCP;lr>,  <sip:172.31.18.20:80;transport=TLS;lr>",
            "endpoint": imsi,
            "user_agent": PsContact.stringifyMisc({
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
                "ua_software": software,
                "connectionId": 1513424614802
            })
        };

    })();

    await db.asterisk.flush();

    await db.asterisk.startListeningPsContacts();

    db.asterisk.query( f.buildInsertQuery("ps_contacts", psContact, "THROW ERROR"));

    let contact = await db.asterisk.evtNewContact.waitFor(1000);

    console.assert(Contact.sanityCheck(contact));
    console.assert(contact.uaSim.imsi === imsi );
    console.assert( contact.uaSim.ua.instance === instance );
    console.assert( contact.uaSim.ua.platform === "android" );
    console.assert( contact.uaSim.ua.pushToken === token );
    console.assert( contact.uaSim.ua.userEmail === email );
    console.assert( contact.uaSim.ua.software === software);

    db.asterisk.deleteContact(contact);

    try{

        await db.asterisk.evtExpiredContact.waitFor(3000);

        console.assert(false);

    }catch{}

    db.asterisk.query( f.buildInsertQuery("ps_contacts", psContact, "THROW ERROR"));
    db.asterisk.query(`DELETE FROM ps_contacts WHERE id= ${f.esc(psContact.id)}`);

    contact= await db.asterisk.evtExpiredContact.waitFor(1000);

    console.assert(Contact.sanityCheck(contact));
    console.assert(contact.uaSim.imsi === imsi );
    console.assert( contact.uaSim.ua.instance === instance );
    console.assert( contact.uaSim.ua.platform === "android" );
    console.assert( contact.uaSim.ua.pushToken === token );
    console.assert( contact.uaSim.ua.userEmail === email );
    console.assert( contact.uaSim.ua.software === software);

    let password= await db.asterisk.createEndpointIfNeededAndGetPassword(imsi);
    
    let rows= await db.asterisk.query(`SELECT * FROM ps_aors WHERE id= ${f.esc(imsi)}`);

    console.assert(rows.length === 1);
    
    rows= await db.asterisk.query(`SELECT * FROM ps_auths WHERE id= ${f.esc(imsi)}`);

    console.assert(rows.length === 1);
    console.assert( rows[0]["username"] === imsi );
    console.assert( rows[0]["password"] === password );

    rows= await db.asterisk.query(`SELECT * FROM ps_endpoints WHERE id= ${f.esc(imsi)}`);

    console.assert(rows.length === 1);

    console.assert( await db.asterisk.createEndpointIfNeededAndGetPassword(imsi) === password );

    console.assert( await db.asterisk.createEndpointIfNeededAndGetPassword(imsi, "RENEW PASSWORD") !== password );

    await db.asterisk.flush();

    console.log("PASS ASTERISK");

}

async function testDbSemasim() {

    await db.semasim.flush();

    console.assert(
        Object.keys(
            await db.semasim.lastMessageReceivedDateBySim()
        ).length === 0
    );

    let uaSim: Contact.UaSim = {
        "imsi": "208150113995832",
        "ua": {
            "instance": "\"<urn:uuid:a98eef4a-5a6d-41ca-8918-e1ef1819fec0>\"",
            "platform": "android",
            "pushToken": [
                "f_l7SPs6o7A:APA91bF_c0VGlz3pQPwrgpFe9U0FRzc",
                "VXlDmG97jt3DTzOlsjbUzsent-yeEz_QpQNhdO3Mbr-",
                "4-XxcSmyKj_Hr-XY_-LefF3RhHsSekVsSeYN95PAtwR",
                "Cpz-i1ytnc5DyMY8je4n69G"
            ].join(""),
            "software": "LinphoneAndroid/3.2.8 (belle-sip/1.6.3)",
            "userEmail": "joseph.garrone.gj@gmail.com"
        }
    };

    console.assert(Contact.UaSim.sanityCheck(uaSim));

    let r = await db.semasim.addUaSim(uaSim);

    console.assert(r.isFirstUaForSim);
    console.assert(r.isUaCreatedOrUpdated);

    r = await db.semasim.addUaSim(uaSim);

    console.assert(!r.isFirstUaForSim);
    console.assert(!r.isUaCreatedOrUpdated);

    (uaSim.ua.software as any) += "...";

    r = await db.semasim.addUaSim(uaSim);

    console.assert(!r.isFirstUaForSim);
    console.assert(r.isUaCreatedOrUpdated);

    let imsi2 = "123456789123456"

    r = await db.semasim.addUaSim({
        "imsi": imsi2,
        "ua": uaSim.ua
    });

    console.assert(r.isFirstUaForSim);
    console.assert(!r.isUaCreatedOrUpdated);

    let mrByDate = await db.semasim.lastMessageReceivedDateBySim()

    console.assert(Object.keys(mrByDate).length === 2);
    console.assert(mrByDate[uaSim.imsi].getTime() === 0);
    console.assert(mrByDate[imsi2].getTime() === 0);

    console.assert(
        !(await db.semasim.MessageTowardGsm.getUnsent(uaSim.imsi)).length
    );


    function areSameUa(ua1: Contact.UaSim.Ua, ua2: Contact.UaSim.Ua) {

        console.assert(ua1.instance === ua2.instance);
        console.assert(ua1.platform === ua2.platform);
        console.assert(ua1.pushToken === ua2.pushToken);
        console.assert(ua1.software === ua2.software);
        console.assert(ua1.userEmail === ua2.userEmail);

    }

    await (async () => {

        let toNumber = "0636786385";
        let text = "foo bar";

        await db.semasim.MessageTowardGsm.add(toNumber, text, uaSim);

        let messages = await db.semasim.MessageTowardGsm.getUnsent(uaSim.imsi);

        console.assert(messages.length === 1);

        let [[message, confirm]] = messages;

        console.assert(message.text === text);
        console.assert(message.toNumber === toNumber);

        console.assert(Contact.UaSim.sanityCheck(message.uaSim));

        console.assert(Contact.UaSim.areSame(message.uaSim, uaSim));

        areSameUa(message.uaSim.ua, uaSim.ua);

        let sendDate = new Date();

        await confirm.setSent(sendDate);

        confirm.setStatusReport({
            "dischargeDate": new Date(sendDate.getTime() + 3000),
            "isDelivered": true,
            "recipient": null as any,
            "sendDate": sendDate,
            "status": "DELIVERED SUCCESS"
        });

        console.assert((await db.semasim.MessageTowardGsm.getUnsent(uaSim.imsi)).length === 0);

    })();

    await (async () => {

        let toNumber = "0636786385";
        let text = "foo bar baz";

        await db.semasim.MessageTowardGsm.add(toNumber, text, uaSim);

        let messages = await db.semasim.MessageTowardGsm.getUnsent(uaSim.imsi);

        console.assert(messages.length === 1);

        let [[message, confirm]] = messages;

        console.assert(message.text === text);
        console.assert(message.toNumber === toNumber);

        console.assert(Contact.UaSim.sanityCheck(message.uaSim));

        console.assert(Contact.UaSim.areSame(message.uaSim, uaSim));

        areSameUa(message.uaSim.ua, uaSim.ua);

        let sendDate = new Date();

        await confirm.setSent(null);

        console.assert((await db.semasim.MessageTowardGsm.getUnsent(uaSim.imsi)).length === 0);

    })();

    console.assert(await db.semasim.MessageTowardSip.unsentCount(uaSim) === 0);

    console.assert(
        (await db.semasim.MessageTowardSip.getUnsent(uaSim)).length === 0
    );

    let uaSim2: Contact.UaSim = {
        "imsi": uaSim.imsi,
        "ua": {
            "instance": "\"<urn:uuid:___2___>\"",
            "platform": "iOS",
            "pushToken": "____________2______________",
            "software": "LinphoneIphone/3.2.8 (belle-sip/1.6.3)",
            "userEmail": uaSim.ua.userEmail
        }
    };

    r = await db.semasim.addUaSim(uaSim2);

    console.assert(r.isUaCreatedOrUpdated === true);
    console.assert(r.isFirstUaForSim === false);

    let uaSim3: Contact.UaSim = {
        "imsi": uaSim.imsi,
        "ua": {
            "instance": "\"<urn:uuid:___3___>\"",
            "platform": "iOS",
            "pushToken": "____________3______________",
            "software": "LinphoneIphone/3.2.8 (belle-sip/1.6.3)",
            "userEmail": "bob@hotmail.com"
        }
    };

    r = await db.semasim.addUaSim(uaSim3);

    console.assert(r.isUaCreatedOrUpdated === true);
    console.assert(r.isFirstUaForSim === false);

    let uaSim4: Contact.UaSim = {
        "imsi": "123456789123450",
        "ua": uaSim.ua
    };

    r = await db.semasim.addUaSim(uaSim4);

    console.assert(r.isUaCreatedOrUpdated === false);
    console.assert(r.isFirstUaForSim === true);

    await (async () => {

        let fromNumber = "0636786385";
        let text = "foo bar baz baz";
        let date = new Date();

        await db.semasim.MessageTowardSip.add(fromNumber, text, date, false, {
            "target": "SPECIFIC UA REGISTERED TO SIM", "uaSim": uaSim
        });

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim)) === 1
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim2)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim3)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim4)) === 0
        );

        let [[message, setSent]] = await db.semasim.MessageTowardSip.getUnsent(uaSim);

        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.fromNumber === fromNumber);
        console.assert(message.isReport === false);
        console.assert(message.text === text);

        await setSent();

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim)) === 0
        );

    })();

    const checkMark = (new Buffer("e29c94", "hex")).toString("utf8");

    await (async () => {

        let fromNumber = "0636786385";
        let text = `${checkMark}${checkMark}`;
        let date = new Date();

        await db.semasim.MessageTowardSip.add(fromNumber, text, date, true, {
            "target": "ALL OTHER UA OF USER REGISTERED TO SIM", "uaSim": uaSim
        });

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim2)) === 1
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim3)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim4)) === 0
        );


        let [[message, setSent]] = await db.semasim.MessageTowardSip.getUnsent(uaSim2);

        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.fromNumber === fromNumber);
        console.assert(message.isReport === true);
        console.assert(message.text === text);

        await setSent();

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim2)) === 0
        );

    })();

    await (async () => {

        let fromNumber = "0636786385";
        let text = `${checkMark}`;
        let date = new Date();

        await db.semasim.MessageTowardSip.add(fromNumber, text, date, true, {
            "target": "ALL UA OF OTHER USERS REGISTERED TO SIM", "uaSim": uaSim
        });

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim2)) === 0
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim3)) === 1
        );

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim4)) === 0
        );


        let [[message, setSent]] = await db.semasim.MessageTowardSip.getUnsent(uaSim3);

        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.fromNumber === fromNumber);
        console.assert(message.isReport === true);
        console.assert(message.text === text);

        await setSent();

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim3)) === 0
        );

    })();

    await (async () => {

        let fromNumber = "0636786385";
        let text = `${checkMark}`;
        let date = new Date();

        console.assert(
            (await db.semasim.MessageTowardSip.add(fromNumber, text, date, true, {
                "target": "ALL UA REGISTERED TO SIM", "imsi": "123436454354565"
            })) === false
        );

        let isHandled = await db.semasim.MessageTowardSip.add(fromNumber, text, date, true, {
            "target": "ALL UA REGISTERED TO SIM", "imsi": uaSim.imsi
        });

        console.assert(isHandled === true);

        for (let uaSimX of [uaSim, uaSim2, uaSim3]) {

            console.assert(
                (await db.semasim.MessageTowardSip.unsentCount(uaSimX)) === 1
            );

        }

        console.assert(
            (await db.semasim.MessageTowardSip.unsentCount(uaSim4)) === 0
        );

        for (let uaSimX of [uaSim, uaSim2, uaSim3]) {

            let [[message, setSent]] = await db.semasim.MessageTowardSip.getUnsent(uaSimX);

            console.assert(message.date.getTime() === date.getTime());
            console.assert(message.fromNumber === fromNumber);
            console.assert(message.isReport === true);
            console.assert(message.text === text);

            await setSent();

            console.assert(
                (await db.semasim.MessageTowardSip.unsentCount(uaSimX)) === 0
            );

        }

    })();

    let imsi = f.genDigits(15);

    let allowedUas: Contact.UaSim.Ua[] = [];

    for (let _ of new Array(15)) {

        let ua = genSamples.generateUa();

        if (allowedUas.length < 10) {
            allowedUas.push(ua);
        }

        f.assertSame(
            await db.semasim.addUaSim({ imsi, ua }),
            {
                "isUaCreatedOrUpdated": true,
                "isFirstUaForSim": allowedUas.length === 1
            }
        );

    }

    await db.semasim.removeUaSim(imsi, allowedUas);

    let remainingUas: Contact.UaSim.Ua[] = [];
    let notAffectedUas: Contact.UaSim.Ua[] = [];

    let rows = await db.semasim.query([
        "SELECT ua.*, ua_sim.imsi",
        "FROM ua",
        "INNER JOIN ua_sim ON ua_sim.ua= ua.id_",
        "GROUP BY ua.id_"
    ].join("\n"));

    for (let row of rows) {

        let ua = {
            "instance": row["instance"],
            "userEmail": row["user_email"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "software": row["software"]
        };

        if (row["imsi"] === imsi) {

            remainingUas.push(ua);

        } else {

            notAffectedUas.push(ua);
        }

    }

    f.assertSame(
        remainingUas,
        allowedUas
    );

    f.assertSame(
        notAffectedUas,
        [uaSim.ua, uaSim2.ua, uaSim3.ua]
    );

    await db.semasim.flush();

    console.log("PASS SEMASIM");

}
