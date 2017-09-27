require("rejection-tracker").main(__dirname, "..", "..");

import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import { DongleExtendedClient, typesDef as t } from "chan-dongle-extended-client";
import * as agi from "../tools/agiClient";
import { Contact, wakeUpAllContactsOfEndpoint, buildDialString } from "./sipContact";
import * as sipApiBackend from "./sipApiClientBackend";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as sipMessage from "./sipMessage";
import * as phone from "../tools/phoneNumberLibrary";
import * as messageQueue from "./messageQueue";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_main");

const dongleClient = DongleExtendedClient.localhost();

debug("Starting semasim gateway !");
//TODO: force re register on startup

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

        let wakeUpAllContactsPromise= wakeUpAllContactsOfEndpoint(imei, 9000);

        let imsi= (await _.getVariable("DONGLEIMSI"))!;
        await _.setVariable("CALLERID(all)", `"" <${phone.toNationalNumber(number, imsi)}>`);

        //await _.setVariable("CALLERID(name-charset)", "utf8");
        //await _.setVariable("CALLERID(name)", name || "");

        let dialString = buildDialString(
            (await wakeUpAllContactsPromise).reachableContacts
        );

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

            messageQueue.notifyNewSipMessagesToSend();

        } else debug("...Call ended");

    }

    agi.startServer(scripts);


    async function onNewActiveDongle(dongle: t.DongleActive) {

        debug("onNewActiveDongle", dongle);

        await db.semasim.addDongleAndSim(dongle.imei, dongle.iccid);

        let password = dongle.iccid.substring(dongle.iccid.length - 4);

        await db.asterisk.addOrUpdateEndpoint(dongle.imei, password);

        messageQueue.sendDonglePendingMessages(dongle.imei);

    }


    (async function findActiveDongleAndStartSipProxy() {

        for (let activeDongle of await dongleClient.getActiveDongles())
            await onNewActiveDongle(activeDongle);

        sipProxy.start();

    })();


    dongleClient.evtDongleConnect.attach(async imei=> {

        debug("dongle connect!");

        let activeDongle= await dongleClient.getActiveDongle(imei);

        if( activeDongle ) await onNewActiveDongle(activeDongle);

        sipApiBackend.claimDongle.makeCall(imei);

    });


    dongleClient.evtActiveDongleDisconnect.attach(async dongle => {

        debug("onDongleDisconnect", dongle);

    });


    db.asterisk.getEvtNewContact().attach(
        async contact=> {

            debug(`New contact: ${contact.pretty}`);

            let isNew = await db.semasim.addUaInstance(contact.uaInstance);

            if (isNew) debug("TODO: it's a new UA, send initialization messages");

            messageQueue.sendPendingSipMessagesToReachableContact(contact);

        }
    );




    sipMessage.getEvtMessage().attach(
        async ({ fromContact, toNumber, text }) => {

            debug("FROM SIP MESSAGE", { toNumber, text });

            await db.semasim.addMessageTowardGsm(
                toNumber,
                text,
                fromContact.uaInstance
            );

            messageQueue.sendDonglePendingMessages(fromContact.uaInstance.dongle_imei);

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

            messageQueue.notifyNewSipMessagesToSend();

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

            messageQueue.notifyNewSipMessagesToSend();

        }
    );

}