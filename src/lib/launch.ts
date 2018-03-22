process.once("warning", error=> { 

    console.log("WARNING WARNING WARNING");

    console.log(error.stack);

});

import { 
    DongleController as Dc, 
    types as dcTypes 
} from "chan-dongle-extended-client";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as messagesDispatcher from "./messagesDispatcher";
import * as voiceCallBridge from "./voiceCallBridge";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Starting semasim gateway !");

export async function launch() {

    debug("Launching...");

    await launchDongleController();

    await db.launch();

    sipProxy.launch();

    voiceCallBridge.initAgi();

    registerListeners();

    init();

    debug("...started");

}

async function launchDongleController() {

    let dc: Dc | undefined = undefined;

    while (!dc) {

        try {

            await Dc.getInstance().initialization;

            dc = Dc.getInstance();

        } catch{

            debug("dongle-extended not initialized yet, scheduling retry...");

            await new Promise(resolve => setTimeout(resolve, 5000));

        }

    }

    dc.evtDisconnect.attachOnce(error => {

        debug(error!.message.red);

        throw error;

    });

}

async function init() {

    let dc = Dc.getInstance();

    for (let dongle of dc.usableDongles.values()) {

        messagesDispatcher.sendMessagesOfDongle(dongle)

    }

    let lastMessageReceivedDateBySim = await db.semasim.lastMessageReceivedDateBySim();

    for (let imsi in lastMessageReceivedDateBySim) {

        //TODO: may throw
        let messages = await dc.getMessagesOfSim({
            imsi,
            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
            "flush": true,
        });

        for (let { number, text, date } of messages) {

            await db.semasim.onDongleMessage(number, text, date, imsi);

        }

    }

}

function registerListeners() {

    let dc = Dc.getInstance();

    sipProxy.backendSocket.evtNewBackendConnection.attach(
        async () => {

            debug("Connection established with backend");

            for (let dongle of dc.usableDongles.values()) {

                sipProxy.backendSocket.remoteApi.notifySimOnline(dongle);

            }

        }
    );

    dc.dongles.evtSet.attach(
        async ([dongle]) => {

            if (dcTypes.Dongle.Locked.match(dongle)) {
                return;
            }

            messagesDispatcher.sendMessagesOfDongle(dongle);

            sipProxy.backendSocket.remoteApi.notifySimOnline(dongle);

        }
    );

    dc.dongles.evtDelete.attach(
        async ([dongle]) => {

            if (dcTypes.Dongle.Locked.match(dongle)) {
                return;
            }

            sipProxy.backendSocket.remoteApi.notifySimOffline(dongle.sim.imsi);

        }
    );

    dc.evtMessage.attach(
        async ({ dongle, message }) => {

            debug("FROM DONGLE MESSAGE", { message });

            let wasAdded = await db.semasim.onDongleMessage(
                message.number,
                message.text,
                message.date,
                dongle.sim.imsi
            );

            if (wasAdded) {

                messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);

                dc.getMessagesOfSim({
                    "imsi": dongle.sim.imsi,
                    "fromDate": message.date,
                    "toDate": message.date,
                    "flush": true
                });

            }

        }
    );

    sipProxy.evtContactRegistration.attach(
        async contact => {

            debug(`Contact registered`);

            let {
                isUaCreatedOrUpdated,
                isFirstUaForSim
            } = await db.semasim.addUaSim(contact.uaSim);

            if (isUaCreatedOrUpdated) {

                sipProxy.backendSocket.remoteApi.notifyNewOrUpdatedUa(
                    contact.uaSim.ua
                );

            }

            if (isFirstUaForSim) {

                debug("First SIM UA");

                let messages = await dc.getMessagesOfSim({
                    "imsi": contact.uaSim.imsi,
                    "flush": true
                });

                let tasks: Promise<any>[] = [];

                for (let { number, text, date } of messages) {

                    tasks[tasks.length] = db.semasim.onDongleMessage(
                        number, text, date, contact.uaSim.imsi
                    );

                }

                await Promise.all(tasks);

            }

            messagesDispatcher.sendMessagesOfContact(contact);

        }
    );

    sipProxy.evtMessage.attach(
        async ({ fromContact, toNumber, text, exactSendDate }) => {

            debug("FROM SIP MESSAGE", { toNumber, text });

            let { uaSim } = fromContact;

            await db.semasim.onSipMessage(
                toNumber, text, uaSim, exactSendDate
            );

            let dongle = Array.from(dc.usableDongles.values()).find(
                ({ sim }) => sim.imsi === fromContact.uaSim.imsi
            );

            if (!dongle) {
                return;
            }

            messagesDispatcher.sendMessagesOfDongle(dongle);

        }
    );

}
