require("rejection-tracker").main(__dirname, "..", "..");

import { 
    DongleController as Dc, 
    types as dcTypes 
} from "chan-dongle-extended-client";
import * as db from "./db";
import * as dbAsterisk from "./dbAsterisk";
import * as sipProxy from "./sipProxy";
import * as messagesDispatcher from "./messagesDispatcher";
import * as voiceCallBridge from "./voiceCallBridge";

import * as sipApiBackend from "./sipApiBackedClientImplementation";
import * as sipApiServer from "./sipApiGatewayServerImplementation";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Starting semasim gateway !");

(async function launch() {

    try {

        await Dc.getInstance().initialization;

    } catch {

        debug("dongle-extended not initialized yet, scheduling retry...");

        await new Promise(resolve => setTimeout(resolve, 5000));

        launch();

        return;

    }

    Dc.getInstance().evtDisconnect.attachOnce( error=> {

        debug(error!.message.red);

        process.exit(-1);

    });

    debug("Launching...");

    registerListeners();

    await dbAsterisk.startListeningPsContacts();

    voiceCallBridge.start();

    sipProxy.start();

    processGsmMessageIoOccurredWhileOffline();

    debug("...started");

})();

async function processGsmMessageIoOccurredWhileOffline() {

    let dc = Dc.getInstance();

    for (let dongle of dc.usableDongles.values()) {

        messagesDispatcher.sendMessagesOfDongle(dongle)

    }

    let lastMessageReceivedDateBySim = await db.lastMessageReceivedDateBySim();

    for (let imsi in lastMessageReceivedDateBySim) {

        //TODO: may throw
        let messages = await dc.getMessagesOfSim({
            imsi,
            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
            "flush": true,
        });

        for (let { number, text, date } of messages) {

            await db.onDongleMessage(number, text, date, imsi);

        }

    }

}

function registerListeners() {

    let dc = Dc.getInstance();

    sipProxy.evtNewBackendSocketConnect.attach(
        async backendSocket => {

            debug("Connection established with backend");

            sipApiServer.startListening(backendSocket);

            sipApiBackend.init(backendSocket);

            for (let dongle of dc.usableDongles.values()) {

                sipApiBackend.notifySimOnline(dongle);

            }

        }
    );

    dc.dongles.evtSet.attach(
        async ([dongle]) => {

            if( dcTypes.Dongle.Locked.match(dongle) ) return;

            messagesDispatcher.sendMessagesOfDongle(dongle);

            sipApiBackend.notifySimOnline(dongle);

        }
    );

    dc.dongles.evtDelete.attach(
        async ([dongle]) => {

            if( dcTypes.Dongle.Locked.match(dongle) ) return;

            sipApiBackend.notifySimOffline(dongle.sim.imsi);

        }
    );

    dc.evtMessage.attach(
        async ({ dongle, message }) => {

            debug("FROM DONGLE MESSAGE", { message });

            let wasAdded= await db.onDongleMessage( 
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
            } = await db.addUaSim(contact.uaSim);

            if (isUaCreatedOrUpdated) {

                sipApiBackend.notifyNewOrUpdatedUa(contact.uaSim.ua);

            }

            if (isFirstUaForSim) {

                debug("First SIM UA");

                let messages = await dc.getMessagesOfSim({
                    "imsi": contact.uaSim.imsi,
                    "flush": true
                });

                let tasks: Promise<any>[]= [];

                for (let { number, text, date } of messages) {

                    tasks[tasks.length]= db.onDongleMessage(number, text, date, contact.uaSim.imsi);

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

            await db.onSipMessage(
                toNumber, text, uaSim, exactSendDate
            );

            let dongle = Array.from(dc.usableDongles.values()).find(
                ({ sim }) => sim.imsi === fromContact.uaSim.imsi
            );

            if (!dongle) return;

            messagesDispatcher.sendMessagesOfDongle(dongle);

        }
    );

}
