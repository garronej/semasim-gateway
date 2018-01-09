
require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as sipMessage from "./sipMessage";
import * as messageQueue from "./messageQueue";
import * as voiceCallBridge from "./voiceCallBridge";
import { Contact } from "./sipContact";

import * as sipApiBackend from "./sipApiBackedClientImplementation";
import * as sipApiServer from "./sipApiGatewayServerImplementation";

import * as crypto from "crypto";

import { c } from "./_constants";

import * as _debug from "debug";
import { DongleController } from "chan-dongle-extended-client/dist/lib/DongleController";
let debug = _debug("_main");

debug("Starting semasim gateway !");

(async function launch() {

    try{

        await Dc.getInstance().initialization;

    }catch(error){

        debug("dongle-extended not initialized yet, scheduling retry...");

        await new Promise(resolve=>setTimeout(resolve, 5000));

        launch();

    }

    debug("Launching...");

    registerListeners();

    await db.asterisk.startListeningPsContacts();

    await sipMessage.startHandling();

    voiceCallBridge.start();

    sipProxy.start();

    processGsmMessageIoOccurredWhileOffline();

})();

async function processGsmMessageIoOccurredWhileOffline(){

    let dc= Dc.getInstance();

    for (let dongle of dc.activeDongles.values()) {

        messageQueue.sendMessagesOfDongle(dongle);

    }

    let lastMessageReceivedDateBySim = await db.semasim.lastMessageReceivedDateBySim();

    for (let imsi in lastMessageReceivedDateBySim) {

        //TODO: may throw
        let messages = await dc.getMessagesOfSim({
            imsi,
            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime()+1),
            "flush": true,
        });

        for (let { number, text, date } of messages) {

            await db.semasim.MessageTowardSip.add(number, text, date, false, {
                "target": "ALL UA REGISTERED TO SIM",
                "imsi": imsi
            });

        }

    }

}

function registerListeners() {

    let dc = Dc.getInstance();

    sipProxy.evtNewBackendSocketConnect.attach(
        async backendSocket => {

            sipApiServer.startListening(backendSocket);

            sipApiBackend.init(backendSocket);

            for (let dongle of dc.activeDongles.values()) {

                sipApiBackend.notifySimOnline(dongle);

            }

        }
    );

    dc.dongles.evtSet.attach(
        async ([dongle]) => {

            if (!Dc.ActiveDongle.match(dongle)) return;

            messageQueue.sendMessagesOfDongle(dongle);

            sipApiBackend.notifySimOnline(dongle);

        }
    );

    dc.dongles.evtDelete.attach(
        async ([dongle]) => {

            if (!Dc.ActiveDongle.match(dongle)) return;

            sipApiBackend.notifySimOffline(dongle.sim.imsi);

        }
    );

    dc.evtMessage.attach(
        async ({ dongle, message }) => {

            debug("FROM DONGLE MESSAGE", { message });

            let isHandeled = await db.semasim.MessageTowardSip.add(
                message.number,
                message.text,
                message.date,
                false,
                {
                    "target": "ALL UA REGISTERED TO SIM",
                    "imsi": dongle.sim.imsi
                }
            );

            if (isHandeled) {

                dc.getMessagesOfSim({
                    "imsi": dongle.sim.imsi,
                    "fromDate": message.date,
                    "toDate": message.date,
                    "flush": true
                });

            }

            messageQueue.notifyNewSipMessagesToSend(dongle.sim.imsi);

        }
    );

    db.asterisk.evtNewContact.attach(
        async contact => {

            debug(`Contact registered`);

            let {
                isUaCreatedOrUpdated,
                isFirstUaForSim
            } = await db.semasim.addUaSim(contact.uaSim);

            if (isUaCreatedOrUpdated) {

                sipApiBackend.notifyNewOrUpdatedUa(contact.uaSim.ua);

            }

            if (isFirstUaForSim) {

                debug("First SIM UA");

                let messages = await dc.getMessagesOfSim({
                    "imsi": contact.uaSim.imsi,
                    "flush": true
                });

                for (let { number, text, date } of messages) {

                    db.semasim.MessageTowardSip.add(
                        number, text, date, false,
                        {
                            "target": "ALL UA REGISTERED TO SIM",
                            "imsi": contact.uaSim.imsi
                        }
                    );

                }

            }

            messageQueue.sendMessagesOfContact(contact);

        }
    );

    sipMessage.evtMessage.attach(
        async ({ fromContact, toNumber, text }) => {

            debug("FROM SIP MESSAGE", { toNumber, text });

            let { uaSim } = fromContact;

            await db.semasim.MessageTowardGsm.add(
                toNumber,
                text,
                uaSim
            );

            let dongle = Array.from(dc.activeDongles.values()).find(
                ({ sim }) => sim.imsi === fromContact.uaSim.imsi
            );

            if (!dongle) return;

            messageQueue.sendMessagesOfDongle(dongle);

        }
    );

}