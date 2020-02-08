import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import { Ami } from "ts-ami";
import * as messagesDispatcher from "./messagesDispatcher";
import * as voiceCallBridge from "./voiceCallBridge";
import {  Evt } from "ts-evt";
import * as i from "../bin/installer";
import * as procAsterisk from "./procAsterisk";
import * as procChanDongleExtended from "./procChanDongleExtended";
import { safePr } from "scripting-tools";
import * as logger from "logger";
import * as dbSemasim from "./dbSemasim";
import * as dbAsterisk from "./dbAsterisk";
import * as backendConnection from "./toBackend/connection";
import * as backendRemoteApiCaller from "./toBackend/remoteApiCaller";
import * as sipContactsMonitor from "./sipContactsMonitor";
import * as sipMessagesMonitor from "./sipMessagesMonitor";
import { phoneNumber } from "phone-number";
import * as cryptoLib from "crypto-lib";
import { workerThreadPoolId } from "./misc/workerThreadPoolId";
import { removeDuplicateContactInSimInternalStorage } from "./misc/removeDuplicateContactInSimInternalStorage";

import * as memwatch from "memwatch-next";

const debug = logger.debugFactory();

setImmediate

debug("Memory leak detection enabled");

memwatch.on("leak", infos => debug("memory leak detected", infos));
memwatch.on("stats", stats=> debug("mem stats", stats));

export async function beforeExit(): Promise<void> {

    const backendSocket = backendConnection.get();

    if (!(backendSocket instanceof Promise)) {
        backendSocket.destroy("Terminating the process");
    }

    cryptoLib.terminateWorkerThreads();

    await Promise.all([
        dbAsterisk.beforeExit().catch(() => { }),
        dbSemasim.beforeExit().catch(() => { }),
        //TODO sip proxy before exist.
        safePr(procChanDongleExtended.beforeExit(), 2500)
            .then(() => procAsterisk.beforeExit())
            .catch(() => { })
    ]);

}


export async function launch() {

    debug("Starting semasim gateway ...");

    cryptoLib.workerThreadPool.preSpawn(workerThreadPoolId, 1);

    await procAsterisk.spawnAsterisk();

    Ami.getInstance(undefined, i.ast_etc_dir_path)
        .evtTcpConnectionClosed.attachOnce(
            () => Promise.reject(new Error("Asterisk TCP connection closed"))
        );

    await procChanDongleExtended.spawnChanDongleExtended();

    //TODO: rename init ? 
    await dbAsterisk.launch();
    await dbSemasim.launch();

    await sipMessagesMonitor.init();

    backendConnection.connect();

    voiceCallBridge.initAgi();

    registerListeners();

    init();

    debug("...started");

}


async function init() {

    const dc = Dc.getInstance();

    //TODO: Remove, it should really be removable
    /*

    for (const dongle of dc.usableDongles.values()) {

        messagesDispatcher.sendMessagesOfDongle(dongle)

    }
    */

    const lastMessageReceivedDateBySim = await dbSemasim.lastMessageReceivedDateBySim();

    for (const imsi in lastMessageReceivedDateBySim) {

        //NOTE: should not throw but if it does it is the expected behavior.
        const messages = await dc.getMessages({
            imsi,
            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
            "flush": true
        });

        for (const { number, text, date } of messages) {

            await dbSemasim.onDongleMessage(number, text, date, imsi);

        }

    }

}

function registerListeners() {

    const dc = Dc.getInstance();

    backendConnection.evtConnect.attach(
        () => {

            debug("Connection established with backend");

            for (const dongle of dc.dongles.values()) {

                if (dcTypes.Dongle.Locked.match(dongle)) {

                    backendRemoteApiCaller.notifyLockedDongle(dongle);

                } else {

                    backendRemoteApiCaller.notifySimOnline(dongle);

                }

            }
        }
    );

    {

        const prKeysByImei = new Map<string, ReturnType<typeof cryptoLib.rsa.generateKeys>>();

        const generateKeys = () => cryptoLib.rsa.generateKeys(null, 128);

        dc.dongles.evtSet.attach(
            async ([dongle]) => {

                const { imei } = dongle;

                if (dcTypes.Dongle.Locked.match(dongle)) {

                    backendRemoteApiCaller.notifyLockedDongle(dongle);

                    prKeysByImei.set(imei, generateKeys());

                    return;

                }


                /*
                (async () => {

                    debug("Test Test Test Test");

                    if ("__mark__" in global) {
                        return;
                    }

                    global["__mark__"] = true;


                    while (true) {

                        await new Promise(resolve => setTimeout(resolve, 5000));

                        debug("=================> changing isGsmConnectionOk value manually");

                        dongle.isGsmConnectivityOk = !dongle.isGsmConnectivityOk;

                        dc.evtGsmConnectivityChange.post({ dongle });

                        if (!dongle.isGsmConnectivityOk) {
                            continue;
                        }

                        for (const cellSignalStrength of ["NULL", "VERY WEAK", "WEAK", "GOOD", "EXCELLENT"] as const) {

                            await new Promise(resolve => setTimeout(resolve, 2000));

                            const previousCellSignalStrength = dongle.cellSignalStrength;

                            dongle.cellSignalStrength = cellSignalStrength;

                            dc.evtCellSignalStrengthChange.post({ dongle, previousCellSignalStrength });

                        }


                    }

                })();
                */



                await removeDuplicateContactInSimInternalStorage(dongle, dc);

                const { imsi } = dongle.sim;

                if (undefined === await dbSemasim.getTowardSimKeys(imsi)) {

                    const { publicKey, privateKey } = await (async () => {

                        let prKeys = prKeysByImei.get(imei);

                        if (prKeys === undefined) {

                            prKeys = generateKeys();

                        } else {

                            prKeysByImei.delete(imei);

                        }

                        return prKeys;

                    })();

                    await dbSemasim.setTowardSimKeys(
                        imsi,
                        cryptoLib.RsaKey.stringify(publicKey),
                        cryptoLib.RsaKey.stringify(privateKey)
                    );

                }

                messagesDispatcher.sendMessagesOfDongle(dongle);

                backendRemoteApiCaller.notifySimOnline(dongle);


            }
        );

    }


    dc.dongles.evtDelete.attach(
        ([dongle]) => {

            if( dcTypes.Dongle.Usable.match(dongle) ){

                sipContactsMonitor.discardContactsRegisteredToSim(
                    dongle.sim.imsi, 
                    "SIM no longer usable"
                );

            }

            backendRemoteApiCaller.notifyDongleOffline(dongle);

        }
    );




    dc.evtGsmConnectivityChange.attach(({ dongle }) =>
        backendRemoteApiCaller.notifyGsmConnectivityChange(
            dongle.sim.imsi,
            dongle.isGsmConnectivityOk
        )
    );

    dc.evtCellSignalStrengthChange.attach(({ dongle }) =>
        backendRemoteApiCaller.notifyCellSignalStrengthChange(
            dongle.sim.imsi,
            dongle.cellSignalStrength
        )
    );

    dc.evtMessage.attach(
        async ({ dongle, message, submitShouldSave }) => {

            debug("FROM DONGLE MESSAGE", { message, "time": message.date.getTime() });

            let evtShouldSave = new Evt<"SAVE MESSAGE" | "DO NOT SAVE MESSAGE">();

            submitShouldSave(evtShouldSave.waitFor());

            const wasAdded = await dbSemasim.onDongleMessage(
                phoneNumber.build(
                    message.number,
                    !!dongle.sim.country ? dongle.sim.country.iso : undefined
                ),
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

    sipContactsMonitor.evtContactRegistration.attach(
        async contact => {

            const {
                //isUaCreatedOrUpdated,
                isFirstUaForSim
            } = await dbSemasim.addUaSim(contact.uaSim);

            if (isFirstUaForSim) {

                debug("First UA registration for this the sim");

                const messages = await dc.getMessages({
                    "imsi": contact.uaSim.imsi,
                    "flush": true
                });

                const tasks: Promise<any>[] = [];

                for (const { number, text, date } of messages) {

                    tasks[tasks.length] = dbSemasim.onDongleMessage(
                        number, text, date, contact.uaSim.imsi
                    );

                }

                await Promise.all(tasks);

            }

            messagesDispatcher.sendMessagesOfContact(contact);

        }
    );

    sipMessagesMonitor.evtMessage.attach(
        async ({ fromContact, toNumber, bundledData }) => {

            const { text } = bundledData;

            debug("FROM SIP MESSAGE", {"imsi": fromContact.uaSim.imsi, toNumber, text });

            const { uaSim } = fromContact;

            switch (bundledData.type) {
                case "MESSAGE": {

                    const exactSendDate = new Date(bundledData.exactSendDateTime);

                    const { appendPromotionalMessage } = bundledData;

                    await dbSemasim.onSipMessage(
                        toNumber,
                        text,
                        uaSim,
                        exactSendDate,
                        appendPromotionalMessage
                    );

                    const dongle = Array.from(dc.usableDongles.values()).find(
                        ({ sim }) => sim.imsi === uaSim.imsi
                    );

                    if (!dongle) {

                        debug("Target dongle not usable".red);
                        return;

                    }


                    messagesDispatcher.sendMessagesOfDongle(dongle);

                } break;
            }

        }
    );

}
