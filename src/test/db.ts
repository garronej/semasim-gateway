require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact, PsContact } from "../lib/sipContact";
import * as db from "../lib/db";
import * as f from "../tools/mySqlFunctions";
import { MySqlEvents } from "../tools/MySqlEvents";
import * as sipLibrary from "../tools/sipLibrary";

(async ()=>{

    await testDbSemasim();
    await testDbAsterisk();

    console.log("ALL TESTS PASSED");

})();

async function testDbSemasim() {

    await db.semasim.flush();

    console.log("TEST DB SEMASIM...");

    let start = Date.now();

    console.assert((await db.semasim.getDonglesLastConnection()).size === 0);

    let lockedDongle: Dc.LockedDongle = {
        "imei": "imei1",
        "sim": {
            "pinState": "SIM PIN",
            "tryLeft": 3
        }
    };

    await db.semasim.addDongle(lockedDongle);

    console.assert((await db.semasim.getDonglesLastConnection()).size === 1);
    console.assert((await db.semasim.getDonglesLastConnection()).has(lockedDongle.imei));

    let dongle: Dc.ActiveDongle = {
        "imei": lockedDongle.imei,
        "isVoiceEnabled": true,
        "sim": {
            "iccid": "iccid1",
            "imsi": "imsi1",
            "number": "number1",
            "phonebook": null as any,
            "serviceProvider": null as any
        }
    };

    await db.semasim.addEndpoint(dongle);

    console.assert((await db.semasim.getDonglesLastConnection()).size === 1);
    console.assert((await db.semasim.getDonglesLastConnection()).has(dongle.imei));

    let endpoint = await db.semasim.getEndpoint({
        "dongle": { "imei": dongle.imei },
        "sim": { "iccid": dongle.sim.iccid }
    });

    console.assert(Contact.UaEndpoint.Endpoint.areSame((await db.semasim.getEndpoints())[0], endpoint));

    console.assert(endpoint.dongle.imei === dongle.imei);
    console.assert(endpoint.dongle.isVoiceEnabled === dongle.isVoiceEnabled);
    console.assert(endpoint.sim.iccid === dongle.sim.iccid);
    console.assert(endpoint.sim.imsi === dongle.sim.imsi);

    let from_number = "num";
    let text = "foo bar baz";
    let date = new Date();
    let isReport = false;

    await db.semasim.MessageTowardSip.add(
        from_number,
        text,
        date,
        isReport,
        {
            "is": "ALL UA_ENDPOINT OF ENDPOINT",
            endpoint
        }
    );

    console.assert(await db.semasim.lastGsmMessageReceived(endpoint) === undefined);

    console.assert(!(await db.semasim.getUas(endpoint.dongle.imei)).length);

    let uaEndpoint1: Contact.UaEndpoint = {
        endpoint,
        "ua": {
            "instance": "instance1",
            "pushToken": {
                "type": "type1",
                "token": "token1"
            },
            "software": "software1"
        }
    };

    await (async () => {

        let { isNewUa, isFirstUaEndpointOfEndpoint } = await db.semasim.addUaEndpoint(uaEndpoint1);

        console.assert(isNewUa);
        console.assert(isFirstUaEndpointOfEndpoint);

    })();

    from_number += "0";
    text += "update";
    isReport = false;

    await db.semasim.MessageTowardSip.add(
        from_number,
        text,
        date,
        isReport,
        {
            "is": "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA",
            endpoint,
            "excludeUa": uaEndpoint1.ua
        }
    );

    console.assert((await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1)) === 0);
    console.assert((await db.semasim.lastGsmMessageReceived(endpoint))!.getTime() === 0);

    let [ua1] = await db.semasim.getUas(endpoint.dongle.imei);

    console.assert(ua1.instance === uaEndpoint1.ua.instance);
    console.assert(ua1.pushToken!.token === uaEndpoint1.ua.pushToken!.token);
    console.assert(ua1.pushToken!.type === uaEndpoint1.ua.pushToken!.type);
    console.assert(ua1.software === uaEndpoint1.ua.software);

    let uaEndpoint2: Contact.UaEndpoint = {
        endpoint,
        "ua": {
            "instance": "instance2",
            "pushToken": undefined,
            "software": "software2"
        }
    };

    await (async () => {

        let { isNewUa, isFirstUaEndpointOfEndpoint } = await db.semasim.addUaEndpoint(uaEndpoint2);

        console.assert(isNewUa);
        console.assert(!isFirstUaEndpointOfEndpoint);

    })();

    console.assert((await db.semasim.getUas(endpoint.dongle.imei)).length === 2);

    await (async () => {

        let { isNewUa, isFirstUaEndpointOfEndpoint } = await db.semasim.addUaEndpoint(uaEndpoint2);

        console.assert(!isNewUa);
        console.assert(!isFirstUaEndpointOfEndpoint);

    })();

    console.assert((await db.semasim.lastGsmMessageReceived(endpoint))!.getTime() === 0);

    console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 0);
    console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 0);

    from_number += "0";
    text += "update";

    await db.semasim.MessageTowardSip.add(
        from_number,
        text,
        date,
        isReport,
        {
            "is": "ALL UA_ENDPOINT OF ENDPOINT",
            endpoint
        }
    );

    console.assert((await db.semasim.lastGsmMessageReceived(endpoint))!.getTime() === date.getTime(), "m1");

    await (async () => {

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 1);
        let arr = await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1);

        console.assert(arr.length === 1);

        let [message, setDelivered] = arr.pop()!;

        console.assert(message.from_number === from_number);
        console.assert(message.text === text);
        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.isReport === isReport);

        await setDelivered();

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 0);
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 0);

    })();

    await (async () => {

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint2) === 1);
        let arr = await db.semasim.MessageTowardSip.getUnsent(uaEndpoint2);

        console.assert(arr.length === 1);

        let [message, setDelivered] = arr.pop()!;

        console.assert(message.from_number === from_number);
        console.assert(message.text === text);
        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.isReport === isReport);

        await setDelivered();

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint2) === 0);
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint2)).length === 0);

    })();

    from_number += "0";
    text += "update";

    await db.semasim.MessageTowardSip.add(
        from_number,
        text,
        date,
        isReport,
        {
            "is": "UA_ENDPOINT",
            "uaEndpoint": uaEndpoint1
        }
    );

    await (async () => {


        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint2) === 0);
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint2)).length === 0);

        let arr = await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1);

        console.assert(arr.length === 1);

        let [message, setDelivered] = arr.pop()!;

        console.assert(message.from_number === from_number);
        console.assert(message.text === text);
        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.isReport === isReport);

        await setDelivered();

        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 0);

    })();

    from_number += "0";
    text += "update";

    await db.semasim.MessageTowardSip.add(
        from_number,
        text,
        date,
        isReport,
        {
            "is": "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA",
            "endpoint": endpoint,
            "excludeUa": uaEndpoint2.ua
        }
    );

    await (async () => {


        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint2) === 0);
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint2)).length === 0);

        let arr = await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1);

        console.assert(arr.length === 1);

        let [message, setDelivered] = arr.pop()!;

        console.assert(message.from_number === from_number);
        console.assert(message.text === text);
        console.assert(message.date.getTime() === date.getTime());
        console.assert(message.isReport === isReport);

        await setDelivered();

        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 0);

    })();


    let from_number1 = "0000";
    let text1 = "foo bar baz foo foo";
    let date1 = new Date(date.getTime() + 100000);

    await db.semasim.MessageTowardSip.add(
        from_number1,
        text1,
        date1,
        false,
        {
            "is": "UA_ENDPOINT",
            "uaEndpoint": uaEndpoint1
        }
    );

    let from_number2 = "000012";
    let text2 = "foo bar baz foo foo bar";
    let date2 = new Date();


    await db.semasim.MessageTowardSip.add(
        from_number2,
        text2,
        date2,
        false,
        {
            "is": "UA_ENDPOINT",
            "uaEndpoint": uaEndpoint1
        }
    );


    await (async () => {

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint2) === 0);
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint2)).length === 0);

        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 2);
        console.assert((await db.semasim.lastGsmMessageReceived(uaEndpoint1.endpoint))!.getTime() === date1.getTime(), "m1");

        let arr = await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1);

        console.assert(arr.length === 2);

        let [[message2, setDelivered2], [message1, setDelivered1]] = arr;

        console.assert(message2.from_number === from_number2);
        console.assert(message2.text === text2);
        console.assert(message2.date.getTime() === date2.getTime());
        console.assert(message2.isReport === false);

        console.assert(message1.from_number === from_number1);
        console.assert(message1.text === text1);
        console.assert(message1.date.getTime() === date1.getTime());
        console.assert(message1.isReport === false);

        await setDelivered1();
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 1);
        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 1);
        await setDelivered2();
        console.assert((await db.semasim.MessageTowardSip.getUnsent(uaEndpoint1)).length === 0);
        console.assert(await db.semasim.MessageTowardSip.unsentCount(uaEndpoint1) === 0);

        console.assert((await db.semasim.lastGsmMessageReceived(uaEndpoint1.endpoint))!.getTime() === date1.getTime(), "m2");

    })();

    console.assert((await db.semasim.MessageTowardGsm.getUnsent(endpoint)).length === 0);

    let to_number1 = "12344";
    let t1 = "foéé**azze& bar";

    await db.semasim.MessageTowardGsm.add(to_number1, t1, uaEndpoint1);

    console.assert((await db.semasim.MessageTowardGsm.getUnsent(endpoint)).length === 1);

    let to_number2 = "123446444";
    let t2 = (new Array(1000)).fill("èç(à$&à@d").join("-");

    await db.semasim.MessageTowardGsm.add(to_number2, t2, uaEndpoint2);

    await (async () => {

        let [[m1, c1], [m2, c2]] = await db.semasim.MessageTowardGsm.getUnsent(endpoint);

        console.assert(m1.text === t1);
        console.assert(m1.to_number === to_number1);
        console.assert(Contact.UaEndpoint.areSame(m1.uaEndpoint, uaEndpoint1));
        console.assert(m1.uaEndpoint.endpoint.dongle.isVoiceEnabled === endpoint.dongle.isVoiceEnabled);
        console.assert(m1.uaEndpoint.endpoint.sim.imsi === endpoint.sim.imsi);
        console.assert(m1.uaEndpoint.ua.pushToken!.token === uaEndpoint1.ua.pushToken!.token);
        console.assert(m1.uaEndpoint.ua.pushToken!.type === uaEndpoint1.ua.pushToken!.type);

        console.assert(m2.text === t2);
        console.assert(m2.to_number === to_number2);
        console.assert(Contact.UaEndpoint.areSame(m2.uaEndpoint, uaEndpoint2));
        console.assert(m2.uaEndpoint.endpoint.dongle.isVoiceEnabled === endpoint.dongle.isVoiceEnabled);
        console.assert(m2.uaEndpoint.endpoint.sim.imsi === endpoint.sim.imsi);
        console.assert(m2.uaEndpoint.ua.pushToken === uaEndpoint2.ua.pushToken);

        let d = new Date();
        await c1.setSent(d);

        console.assert((await db.semasim.MessageTowardGsm.getUnsent(endpoint)).length === 1);

        await c2.setSent(null);

        console.assert((await db.semasim.MessageTowardGsm.getUnsent(endpoint)).length === 0);

        let statusReport: Dc.StatusReport = {
            "dischargeDate": new Date(),
            "isDelivered": true,
            "recipient": to_number1,
            "sendDate": d,
            "status": "SUCCESS"
        };

        await c1.setStatusReport(statusReport);


    })();

    let runTime = Date.now() - start;

    await db.semasim.flush();

    console.log(`...PASS! runTime: ${runTime}ms`);

}

async function testDbAsterisk() {

    console.log("TEST DB ASTERISK...");

    await db.asterisk.flush();
    await db.semasim.flush();

    let start = Date.now();

    let dongle: Dc.ActiveDongle = {
        "imei": "imei1",
        "isVoiceEnabled": true,
        "sim": {
            "iccid": "123456789",
            "imsi": "imsi1",
            "number": "number1",
            "phonebook": null as any,
            "serviceProvider": null as any
        }
    };

    await db.semasim.addEndpoint(dongle);

    let endpoint = await db.semasim.getEndpoint({
        "dongle": { "imei": dongle.imei },
        "sim": { "iccid": dongle.sim.iccid }
    });

    console.assert( (await db.asterisk.getContacts(endpoint)).length === 0 );

    await db.asterisk.addEndpoint(dongle.imei, dongle.sim.iccid);

    console.assert(dongle.sim.iccid === await db.asterisk.getIccidOfEndpoint(dongle.imei));

    let connectionId= Date.now();

    let ua: Contact.UaEndpoint.Ua= {
        "instance": "instance1__________________________________________",
        "software": "software1__________________________________________________________",
        "pushToken": {
            "type": "type1",
            "token": "token1"
        }
    }

    let contactUri= [
        `sip:${dongle.imei}@192.168.0.13:48805;app-id=851039092461;`,
        `pn-type=${ua.pushToken!.type};pn-tok=${ua.pushToken!.token};pn-silent=1;transport=tls`
    ].join("");

    let psContact: PsContact = {
        "endpoint": dongle.imei,
        "id": "contactId",
        "user_agent": PsContact.stringifyMisc({
            connectionId,
            "ua_instance": ua.instance,
            "ua_software": ua.software,
            "pushToken": (()=>{

                    let { params } = sipLibrary.parseUri(contactUri);

                    let type = params["pn-type"];
                    let token = params["pn-tok"];

                    return (type && token)?{ type, token }:undefined;

            })()
        }),
        "uri": (()=>{

            let contactAoR: any= { "uri": contactUri };

            let parsedUri = sipLibrary.parseUri(contactAoR.uri);

            parsedUri.params = {};

            contactAoR.uri = sipLibrary.stringifyUri(parsedUri);

            return contactAoR.uri;

        })(),
        "path": `<sip:0.0.0.1:666;lr>, <sip:0.0.0.0:333;lr>`
    };

    let validateContact = function(
        contact: Contact, 
        psContact: PsContact, 
        ua: Contact.UaEndpoint.Ua, 
        connectionId: number
    ) {

        console.assert(contact.id === psContact.id);
        console.assert(contact.uri === psContact.uri);
        console.assert(contact.path === psContact.path);

        console.assert(contact.connectionId === connectionId);

        console.assert(Contact.UaEndpoint.Endpoint.areSame(contact.uaEndpoint.endpoint, endpoint));
        console.assert(contact.uaEndpoint.endpoint.dongle.isVoiceEnabled === endpoint.dongle.isVoiceEnabled);
        console.assert(contact.uaEndpoint.endpoint.sim.imsi === endpoint.sim.imsi);

        console.assert(contact.uaEndpoint.ua.instance === ua.instance);
        console.assert(contact.uaEndpoint.ua.software === ua.software);
        console.assert(contact.uaEndpoint.ua.pushToken!.token === ua.pushToken!.token);
        console.assert(contact.uaEndpoint.ua.pushToken!.type === ua.pushToken!.type);

    };

    try{
        MySqlEvents.instance;
    }catch{
        await db.asterisk.initializeEvt();
    }

    let pr: Promise<any> = db.asterisk.getEvtNewContact().attachOnce(
        3001,
        contact => validateContact(contact, psContact, ua, connectionId)
    );

    await (async () => {

        let [sql, values] = f.buildInsertQuery("ps_contacts", psContact as any);

        await db.asterisk.query(sql, values);

    })();

    await pr;

    await (async () => {

        let contacts = await db.asterisk.getContacts(endpoint);

        console.assert(contacts.length === 1);

        let [contact] = contacts;

        validateContact(contact, psContact, ua, connectionId);

    })();

    pr = db.asterisk.getEvtExpiredContact().attachOnce(
        3002,
        contact => validateContact(contact, psContact, ua, connectionId)
    );

    await db.asterisk.query("DELETE FROM ps_contacts WHERE id=?", [psContact.id]);

    await pr;

    await (async () => {

        let [sql, values] = f.buildInsertQuery("ps_contacts", psContact as any);

        await db.asterisk.query(sql, values);

    })();

    console.assert((await db.asterisk.getContacts(endpoint)).length === 1);

    let [contact] = await db.asterisk.getContacts(endpoint);

    pr = db.asterisk.getEvtExpiredContact().waitFor(2000);

    start+= 2000;

    db.asterisk.deleteContact(contact);

    
    try {
        await pr;
        console.assert(false);
    } catch{ }
    

    console.assert((await db.asterisk.getContacts(endpoint)).length === 0);

    let connectionId2 = Date.now();


    let ua2: Contact.UaEndpoint.Ua = {
        "instance": "instance2____________________________________",
        "software": "software2______________________________________________________",
        "pushToken": {
            "type": "type2",
            "token": "token2"
        }
    }

    let contactUri2= [
        `sip:${dongle.imei}@192.168.0.10:54433;app-id=851039092461;`,
        `pn-type=${ua2.pushToken!.type};pn-tok=${ua2.pushToken!.token};pn-silent=1;transport=tls`
    ].join("");

    let psContact2: PsContact = {
        "endpoint": dongle.imei,
        "id": "contactId2",
        "user_agent": PsContact.stringifyMisc({
            "connectionId": connectionId2,
            "ua_instance": ua2.instance,
            "ua_software": ua2.software,
            "pushToken": (()=>{

                    let { params } = sipLibrary.parseUri(contactUri2);

                    let type = params["pn-type"];
                    let token = params["pn-tok"];

                    return (type && token)?{ type, token }:undefined;

            })()
        }),
        "uri": (()=>{

            let contactAoR: any= { "uri": contactUri2 };

            let parsedUri = sipLibrary.parseUri(contactAoR.uri);

            parsedUri.params = {};

            contactAoR.uri = sipLibrary.stringifyUri(parsedUri);

            return contactAoR.uri;

        })(),
        "path": `<sip:0.0.0.1:666;lr>, <sip:0.0.0.0:333;lr>`
    };

    await (async () => {

        let [sql, values] = f.buildInsertQuery("ps_contacts", psContact as any);

        await db.asterisk.query(sql, values);

    })();

    await (async () => {

        let [sql, values] = f.buildInsertQuery("ps_contacts", psContact2 as any);

        await db.asterisk.query(sql, values);

    })();

    console.assert((await db.asterisk.getContacts(endpoint)).length === 2);

    let [contact1, contact2] = await db.asterisk.getContacts(endpoint);

    if (contact1.id === psContact.id) {

        validateContact(contact1, psContact, ua, connectionId);
        validateContact(contact2, psContact2, ua2, connectionId2);

    } else {

        validateContact(contact2, psContact, ua, connectionId);
        validateContact(contact1, psContact2, ua2, connectionId2);

    }

    pr = db.asterisk.getEvtExpiredContact().waitFor(2000);

    start+= 2000;

    db.asterisk.flushContacts();

    try {
        await pr;
        console.assert(false);
    } catch{ }

    console.assert((await db.asterisk.getContacts(endpoint)).length === 0);

    let runTime= Date.now() - start;

    await db.asterisk.flush();
    await db.semasim.flush();

    console.log(`...PASS! runTime: ${runTime}ms`);

}
