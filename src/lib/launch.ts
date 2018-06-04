import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import { Ami } from "ts-ami";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
//TODO: Create issue on Typescript repository.
dcMisc;
import * as db from "./db";
import * as sipProxy from "./sipProxy";
import * as messagesDispatcher from "./messagesDispatcher";
import * as voiceCallBridge from "./voiceCallBridge";
import { SyncEvent } from "ts-events-extended";
import * as child_process from "child_process";
import { 
    ast_dir_path,ast_path, 
    ast_etc_dir_path, 
    ast_main_conf_path, 
    ld_library_path_for_asterisk
} from "../bin/installer";
import * as path from "path";

import "colors";

import * as _debug from "debug";
let debug = _debug("_launch");

debug("Starting semasim gateway");

let dc!: Dc;

export async function launch() {

    debug("Launching...");

    await new Promise<void>(
        resolve => spawn_asterisk(message => {

            debug(`asterisk: ${message}`)

            if (!!message.match(/Asterisk\ Ready\./)) {

                resolve();

            }

        }).catch((error) => {
            debug(error.message);
            process.exit(-1);
        })
    );

    Ami.getInstance(undefined, ast_etc_dir_path)
        .evtTcpConnectionClosed.attachOnce(() => {

            debug("Asterisk TCP connection closed");

            process.exit(-1);

        });

    await launchDongleController();

    await db.launch();

    sipProxy.launch();

    voiceCallBridge.initAgi();

    registerListeners();

    init();

    debug("...started");

}

export async function spawn_asterisk(
    log: (message: string) => void
): Promise<never> {

    const home_path = path.join(ast_dir_path, "var", "lib", "asterisk")

    const asterisk_child_process = child_process.spawn(
        ast_path,
        ["-fvvvv", "-C", ast_main_conf_path],
        {
            "cwd": home_path,
            "env": {
                "HOME": home_path,
                "LD_LIBRARY_PATH": ld_library_path_for_asterisk
            }
        }
    );

    asterisk_child_process.stdout.on("data", data => log(data.toString()))
    asterisk_child_process.stderr.on("data", data => log(data.toString().red))

    return new Promise<never>(
        (resolve, reject) => asterisk_child_process.once("close", code => reject(new Error(`Asterisk terminated with code ${code}`)))
    );

}

async function launchDongleController() {

    while (true) {

        dc = Dc.getInstance("127.0.0.1", dcMisc.port);

        try {

            await dc.prInitialization;

        } catch{

            debug("dongle-extended not initialized yet, scheduling retry...");

            await new Promise(resolve => setTimeout(resolve, 3000));

            continue;

        }

        break;

    }

    dc.evtClose.attachOnce(() => {

        debug("chan-dongle-extended service stopped");

        process.exit(-1);

    });

}

async function init() {

    for (let dongle of dc.usableDongles.values()) {

        messagesDispatcher.sendMessagesOfDongle(dongle)

    }

    let lastMessageReceivedDateBySim = await db.semasim.lastMessageReceivedDateBySim();

    for (let imsi in lastMessageReceivedDateBySim) {

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
