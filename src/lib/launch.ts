import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import { Ami } from "ts-ami";
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as messagesDispatcher from "./messagesDispatcher";
import * as voiceCallBridge from "./voiceCallBridge";
import { SyncEvent } from "ts-events-extended";
import * as i from "../bin/installer";
import { spawnAsterisk, beforeExit as spawnAsteriskBeforeExit } from "./asteriskProcess";
import { spawnChanDongleExtended, beforeExit as  spawnChanDongleExtendedBeforeExit } from "./chanDongleExtendedProcess";
import { safePr } from "scripting-tools";
import * as logger from "logger";

const debug = logger.debugFactory();

export async function beforeExit(): Promise<void> {

    await Promise.all([
        safePr(db.beforeExit()),
        sipProxy.beforeExit(),
        (async () => {

            await safePr(spawnChanDongleExtendedBeforeExit(), 2500);

            await safePr(spawnAsteriskBeforeExit());

        })()
    ]);

}


export async function launch() {

    debug("Starting semasim gateway...");

    await spawnAsterisk();

    Ami.getInstance(undefined, i.ast_etc_dir_path)
        .evtTcpConnectionClosed.attachOnce(
            () => Promise.reject(new Error("Asterisk TCP connection closed"))
        );
    
    await spawnChanDongleExtended();

    await db.launch();

    sipProxy.launch();

    voiceCallBridge.initAgi();

    registerListeners();

    init();

    debug("...started");

}

async function init() {

    const dc = Dc.getInstance();

    for (const dongle of dc.usableDongles.values()) {

        messagesDispatcher.sendMessagesOfDongle(dongle)

    }

    const lastMessageReceivedDateBySim = await db.semasim.lastMessageReceivedDateBySim();

    for (const imsi in lastMessageReceivedDateBySim) {

        //NOTE: should not throw but if it does it is the expected behavior.
        const messages = await dc.getMessages({
            imsi,
            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
            "flush": true
        });

        for (let { number, text, date } of messages) {

            await db.semasim.onDongleMessage(number, text, date, imsi);

        }

    }

}

function registerListeners() {

    const dc = Dc.getInstance();

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
        async ({ dongle, message, submitShouldSave }) => {

            debug("FROM DONGLE MESSAGE", { message });

            let evtShouldSave = new SyncEvent<"SAVE MESSAGE" | "DO NOT SAVE MESSAGE">();

            submitShouldSave(evtShouldSave.waitFor());

            let wasAdded = await db.semasim.onDongleMessage(
                message.number,
                message.text,
                message.date,
                dongle.sim.imsi
            );

            if (wasAdded) {

                messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);

                evtShouldSave.post("DO NOT SAVE MESSAGE");

            } else {

                evtShouldSave.post("SAVE MESSAGE");

            }

        }
    );

    sipProxy.evtContactRegistration.attach(
        async contact => {

            debug(`Contact registered`, contact);

            let {
                isUaCreatedOrUpdated,
                isFirstUaForSim
            } = await db.semasim.addUaSim(contact.uaSim);

            if (isUaCreatedOrUpdated) {

                await sipProxy.backendSocket.remoteApi.notifyNewOrUpdatedUa(
                    contact.uaSim.ua
                );

            }

            if (isFirstUaForSim) {

                debug("First SIM UA");

                let messages = await dc.getMessages({
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

                debug("Target dongle not usable".red);

                return;
            }

            messagesDispatcher.sendMessagesOfDongle(dongle);

        }
    );

}
