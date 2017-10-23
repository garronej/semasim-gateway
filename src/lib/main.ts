
import { DongleController as Dc } from "chan-dongle-extended-client";
import * as phone from "../tools/phoneNumberLibrary";
import * as sipApiBackend from "./sipApiClientBackend";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as sipMessage from "./sipMessage";
import * as messageQueue from "./messageQueue";
import * as voiceCallBridge from "./voiceCallBridge";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Starting semasim gateway !");

let dc = Dc.getInstance();

dc.dongles.evtSet.attachPrepend(
    async ([dongle]) => {

        if (Dc.ActiveDongle.match(dongle)) {

            await handleActiveDongle(dongle);

        } else {

            await handleLockedDongle(dongle);

        }

        sipApiBackend.claimDongle.makeCall(dongle.imei);

    }
);

dc.evtMessage.attach(
    async ({ dongle, message }) => {

        debug("FROM DONGLE MESSAGE", { message });

        let endpoint= { 
            "dongle": { 
                "imei": dongle.imei 
            } , 
            "sim": { 
                "iccid": dongle.sim.iccid 
            } 
        };

        await db.semasim.MessageTowardSip.add(
            message.number,
            message.text,
            message.date,
            false,
            {
                "is": "ALL UA_ENDPOINT OF ENDPOINT",
                endpoint
            }
        );

        messageQueue.notifyNewSipMessagesToSend(endpoint);

    }
);


db.asterisk.getEvtNewContact().attach(
    async contact => {

        debug(`New sip contact`);

        let { isNewUa, isFirstUaEndpointOfEndpoint } = await db.semasim.addUaEndpoint(contact.uaEndpoint);

        if (isFirstUaEndpointOfEndpoint) {

            debug("First ua of endpoint");

            await (async function retrieveGsmMessageAlreadyReceived() {

                let imei = contact.uaEndpoint.endpoint.dongle.imei;
                let iccid = contact.uaEndpoint.endpoint.sim.iccid;

                let messages = await dc.getMessages({ "flush": true, imei, iccid });

                debug(`${messages[imei][iccid].length} messages to send`);

                for (let message of messages[imei][iccid]) {

                    debug(message);

                    db.semasim.MessageTowardSip.add(
                        message.number,
                        message.text,
                        message.date,
                        false,
                        {
                            "is": "ALL UA_ENDPOINT OF ENDPOINT",
                            "endpoint": { "dongle": { imei }, "sim": { iccid } }
                        }
                    );

                }

            })();

        }

        messageQueue.sendMessagesOfContact(contact);

    }
);

sipMessage.getEvtMessage().attach(
    async ({ fromContact, toNumber, text }) => {

        debug("FROM SIP MESSAGE", { toNumber, text });

        let { uaEndpoint }= fromContact;

        await db.semasim.MessageTowardGsm.add(
            toNumber, 
            text, 
            uaEndpoint
        );

        messageQueue.sendMessagesOfDongle(uaEndpoint.endpoint);

    }
);

async function handleLockedDongle(dongle: Dc.LockedDongle) {

    debug("handleLockedDongle: ", dongle);

    await db.semasim.addDongle(dongle);

}

async function handleActiveDongle(dongle: Dc.ActiveDongle) {

    debug("handleActiveDongle: ", dongle);

    (function leveragePhoneNumberLib(dongle: Dc.ActiveDongle) {

        let contacts: Dc.Contact[] = [];

        for (let contact of dongle.sim.phonebook.contacts) {
            if (!contact.name || !contact.number) continue;
            contact.number = phone.toNationalNumber(contact.number, dongle.sim.imsi);
            contacts.push(contact);
        }

        dongle.sim.phonebook.contacts = contacts;

        if (dongle.sim.number) {
            dongle.sim.number = phone.toNationalNumber(dongle.sim.number, dongle.sim.imsi);
        }

        let imsiInfos = phone.getImsiInfos(dongle.sim.imsi);

        if (imsiInfos) {
            dongle.sim.serviceProvider = imsiInfos.network_name;
        }

    })(dongle);

    await db.semasim.addEndpoint(dongle);

    let imei= dongle.imei;
    let iccid= dongle.sim.iccid;

    await db.asterisk.addEndpoint(imei, iccid);

    messageQueue.sendMessagesOfDongle({ "dongle": { imei }, "sim": { iccid }});

}

(async function handleConnectedDonglesThenStartSipProxy() {

    let tasks: Promise<void>[] = [];

    tasks = [db.asterisk.flushContacts()];

    tasks[tasks.length] = (async function retrieveGsmMessageReceivedWhileDown() {

        let tasks: Promise<void>[] = [];

        for (let endpoint of await db.semasim.getEndpoints()) {

            tasks[tasks.length] = (async () => {

                let fromDate = await db.semasim.lastGsmMessageReceived(endpoint);

                if (!fromDate) return;

                let imei = endpoint.dongle.imei;
                let iccid = endpoint.sim.iccid;

                let messages = await dc.getMessages({
                    imei, iccid, fromDate, "flush": true
                });

                let tasks: Promise<void>[] = [];

                for (let message of messages[imei][iccid]) {

                    debug(`Message received while down: `, message);

                    tasks[tasks.length] = db.semasim.MessageTowardSip.add(
                        message.number,
                        message.text,
                        message.date,
                        false,
                        {
                            "is": "ALL UA_ENDPOINT OF ENDPOINT",
                            "endpoint": endpoint
                        }
                    );

                }

                await Promise.all(tasks);

            })();

        }

        await Promise.all(tasks);

    })();

    for( let dongle of dc.dongles.values() ){

        if( Dc.ActiveDongle.match(dongle) ){
            tasks.push(handleActiveDongle(dongle));
        }else{
            tasks.push(handleLockedDongle(dongle));
        }

    }

    await tasks;

    sipProxy.start();

})();

voiceCallBridge.start();
