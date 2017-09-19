require("rejection-tracker").main(__dirname, "..", "..");

import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import { DongleExtendedClient, typesDef as t } from "chan-dongle-extended-client";
import * as agi from "../tools/agiClient";
import { Contact, contactIo } from "./sipContact";
import * as sipApiBackend from "./sipApiClientBackend";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as sipMessage from "./sipMessage";
import * as phone from "../tools/phoneNumberLibrary";
import * as AsyncLock from "async-lock";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_main");

const dongleClient = DongleExtendedClient.localhost();

debug("Starting semasim gateway !");

(async function callee() {

    try{

        let { defaults }= await dongleClient.getConfig();

        start(defaults.context);

    }catch(error){

        debug("dongle extended not initialized yet, scheduling retry...");

        await new Promise(resolve=>setTimeout(resolve, 5000));

        callee();

    }

})();

function start(dongleCallContext: string) {

    debug("Dongle extended initialized!");

    let scripts: agi.Scripts = {};

    scripts[c.sipCallContext] = {};
    scripts[c.sipCallContext][c.phoneNumber] = async (channel: agi.AGIChannel) => {

        let _ = channel.relax;

        debug("FROM SIP CALL!");

        let imei = channel.request.callerid;

        await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

        await _.setVariable("AGC(rx)", c.gain);

        await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);

        //TODO: Increase volume on TX

        debug("call terminated");

    };

    scripts[dongleCallContext] = {};
    scripts[dongleCallContext][c.phoneNumber] = async (channel: agi.AGIChannel) => {

        let _ = channel.relax;

        let number = channel.request.callerid;

        debug(`Call from ${number} !`);

        let imei = (await _.getVariable("DONGLEIMEI"))!;

        let wakeUpAllContactsPromise= contactIo.wakeUpAllContacts(imei, 9000);

        let imsi= (await _.getVariable("DONGLEIMSI"))!;
        await _.setVariable("CALLERID(all)", `"" <${phone.toNationalNumber(number, imsi)}>`);

        //await _.setVariable("CALLERID(name-charset)", "utf8");
        //await _.setVariable("CALLERID(name)", name || "");

        let dialString = (await wakeUpAllContactsPromise)
            .reachableContacts
            .map(({ uri }) => `PJSIP/${imei}/${uri}`).join("&");

        if (!dialString) {

            //TODO send missed call to all contacts!
            debug("No contact to dial!");

            return;

        }

        debug("Dialing...");

        debug({ dialString });

        let failure = await agi.dialAndGetOutboundChannel(
            channel,
            dialString,
            async (outboundChannel) => {

                let _ = outboundChannel.relax;

                await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

                await _.setVariable("AGC(rx)", c.gain);

                //TODO: Increase volume on TX

            }
        );

        if (failure) {

            await db.semasim.addMessageTowardSip(
                number,
                c.strMissedCall,
                new Date(),
                { "allUaInstanceOfImei": imei }
            );

            notifyNewSipMessagesToSend();

        } else debug("...Call ended");

    }

    agi.startServer(scripts);


    async function onNewActiveDongle(dongle: t.DongleActive) {

        debug("onNewActiveDongle", dongle);

        await db.semasim.addDongleAndSim(dongle.imei, dongle.iccid);

        let password = dongle.iccid.substring(dongle.iccid.length - 4);

        await db.asterisk.addOrUpdateEndpoint(dongle.imei, password);

        sendDonglePendingMessages(dongle.imei);

    }



    (async function findActiveDongleAndStartSipProxy() {

        for (let activeDongle of await dongleClient.getActiveDongles())
            await onNewActiveDongle(activeDongle);

        sipProxy.start();

    })();

    dongleClient.evtNewActiveDongle.attach(async dongle => {

        await onNewActiveDongle(dongle);

        sipApiBackend.claimDongle.makeCall(dongle.imei);

    });

    dongleClient.evtActiveDongleDisconnect.attach(async dongle => {

        debug("onDongleDisconnect", dongle);

    });



    contactIo.getEvtNewContact().attach(async contact => {

        //debug("New contact", Contact.pretty(contact));
        debug("New contact", Contact.readInstanceId(contact));

        let isNew = await db.semasim.addUaInstance(Contact.buildUaInstancePk(contact))

        if (isNew) {

            debug("TODO: it's a new UA, send initialization messages");

        }

        sendPendingSipMessagesToReachableContact(contact);

    });

    contactIo.getEvtExpiredContact().attach(async contactUri => {

        debug("Expired contact: ", contactUri);

        sipApiBackend.wakeUpUserAgent.makeCall(contactUri);

    });

    sipMessage.startAccepting();

    const lock1 = new AsyncLock();
    async function sendDonglePendingMessages(imei: string) {
        await lock1.acquire(imei, async () => {
            let messages = await db.semasim.getUnsentMessageOfDongleSim(imei);
            let messByNum = new Map<string, typeof messages>();
            for (let message of messages) {
                let { to_number } = message;
                if (!messByNum.has(to_number)) messByNum.set(to_number, []);
                messByNum.get(to_number)!.push(message);
            }
            let tasks: Promise<void>[] = [];
            for (let messages of messByNum.values()) {
                tasks[tasks.length] = (async () => {
                    for (let message of messages) {

                        let { id, sender, to_number, text } = message;

                        let sentMessageId: number;
                        try {
                            sentMessageId = await dongleClient.sendMessage(imei, to_number, text);
                        } catch (error) {
                            if (error.message !== t.errorMessages.messageNotSent) return;
                            sentMessageId = 0;
                        }
                        await db.semasim.setMessageToGsmSentId(id, sentMessageId);
                        if (sentMessageId) {
                            await db.semasim.addMessageTowardSip(
                                to_number,
                                `---Message send, sentMessageId: ${sentMessageId}---`,
                                new Date(),
                                { "uaInstance": sender }
                            );
                        } else {
                            await db.semasim.addMessageTowardSip(
                                to_number,
                                `Error message not sent`,
                                new Date(),
                                { "uaInstance": sender }
                            );
                        }
                        notifyNewSipMessagesToSend();
                    }
                })();
            }
            await Promise.all(tasks);
        });
    }

    const lock2 = new AsyncLock();
    async function sendPendingSipMessagesToReachableContact(contact: Contact) {
        let contactPk = Contact.buildUaInstancePk(contact);
        await lock2.acquire(
            JSON.stringify(contactPk),
            async () => {
                let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(contactPk);
                for (let message of messages) {
                    debug(`Sending: ${JSON.stringify(message.text)} from ${message.from_number}`);
                    let received: boolean;
                    try {
                        received = await sipMessage.sendMessage(
                            contact,
                            message.from_number,
                            {},
                            message.text
                        );
                    } catch (error) {
                        debug("error:", error.message);
                        break;
                    }
                    if (!received) {
                        debug("Not, received, break!");
                        break;
                    }
                    await db.semasim.setMessageTowardSipDelivered(contactPk, message.id);
                }
            }
        );
    }

    async function notifyNewSipMessagesToSend() {

        (await db.asterisk.queryContacts()).forEach(async contact => {

            let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(
                Contact.buildUaInstancePk(contact)
            );

            if (!messages.length) return;

            //TODO remove try
            try {

                let evtTracer: contactIo.WakeUpContactTracer = new SyncEvent();

                contactIo.wakeUpContact(contact, 0, evtTracer);

                let status = await evtTracer.waitFor();

                if (status !== "REACHABLE") return;

                sendPendingSipMessagesToReachableContact(contact);

            } catch (error) { return; }

        });

    }


    sipMessage.evtMessage.attach(
        async ({ fromContact, toNumber, text }) => {

            debug("FROM SIP MESSAGE", { toNumber, text });

            await db.semasim.addMessageTowardGsm(
                toNumber,
                text,
                Contact.buildUaInstancePk(fromContact)
            );

            sendDonglePendingMessages(fromContact.endpoint);

        }
    );

    dongleClient.evtNewMessage.attach(
        async ({ imei, imsi, number, text, date }) => {

            debug("FROM DONGLE MESSAGE", { text });

            await db.semasim.addMessageTowardSip(
                phone.toNationalNumber(number, imsi),
                text,
                date,
                { "allUaInstanceOfImei": imei }
            );

            notifyNewSipMessagesToSend();

        }
    );

    dongleClient.evtMessageStatusReport.attach(
        async ({ imei, imsi, messageId, isDelivered, dischargeTime, recipient, status }) => {

            debug("FROM DONGLE STATUS REPORT", status);

            let resp = await db.semasim.getSenderAndTextOfSentMessageToGsm(imei, messageId);

            if (!resp) return;

            let { sender, text } = resp;

            await db.semasim.addMessageTowardSip(
                phone.toNationalNumber(recipient, imsi),
                `---STATUS REPORT FOR MESSAGE ID ${messageId}: ${status}---`,
                dischargeTime,
                { "uaInstance": sender }
            );

            await db.semasim.addMessageTowardSip(
                recipient,
                `YOU:\n${text}`,
                dischargeTime,
                { "allUaInstanceOfEndpointOtherThan": sender }
            );

            notifyNewSipMessagesToSend();

        }
    );

}