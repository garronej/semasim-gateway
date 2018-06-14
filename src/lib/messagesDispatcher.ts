import * as AsyncLock from "async-lock";
import {
    DongleController as Dc,
    types as dcTypes
} from "chan-dongle-extended-client";
import { semasim as db } from "./db";
import * as sipProxy from "./sipProxy";
import * as types from "./types";
import * as logger from "logger";

const debug = logger.debugFactory();

export function sendMessagesOfDongle(
    dongle: dcTypes.Dongle.Usable
) {

    sendMessagesOfDongle.lock.acquire(dongle.imei, async () => {

        let dc = Dc.getInstance();

        for (
            let [message, { onSent, onStatusReport }] of
            await db.getUnsentMessagesTowardGsm(dongle.sim.imsi)
        ) {

            let sendMessageResult: dcTypes.SendMessageResult;

            try {

                sendMessageResult = await dc.sendMessage(
                    dongle.imei, message.toNumber, message.text
                );

            } catch {

                return;

            }

            let sendDate = sendMessageResult.success ?
                sendMessageResult.sendDate : null;

            onSent(sendDate).then(() => notifyNewSipMessagesToSend(dongle.sim.imsi));

            if (!sendMessageResult.success) {

                debug("Dongle send error".red, { sendMessageResult });

                if (sendMessageResult.reason === "DISCONNECT") {
                    return;
                } else {
                    continue;
                }

            }

            dc.evtStatusReport.attachOnce(
                ({ statusReport }) => statusReport.sendDate.getTime() === sendDate!.getTime(),
                ({ statusReport }) => onStatusReport(statusReport)
                    .then(() => notifyNewSipMessagesToSend(dongle.sim.imsi))
            );


        }

    });
}

export namespace sendMessagesOfDongle {
    export const lock = new AsyncLock();
}

export async function notifyNewSipMessagesToSend(
    imsi: string
) {

    for (let contact of sipProxy.getContacts(imsi)) {

        if (!(await db.messageTowardSipUnsentCount(contact.uaSim))) {
            continue;
        }

        if (
            (await sipProxy.backendSocket.remoteApi.wakeUpContact(contact))
            ===
            "REACHABLE"
        ) {
            sendMessagesOfContact(contact);
        }

    }

}

/** Assert contact reachable  */
export function sendMessagesOfContact(contact: types.Contact) {

    sendMessagesOfContact.lock.acquire(
        types.misc.generateUaSimId(contact.uaSim),
        async () => {

            for (
                let [message, onReceived] of
                await db.getUnsentMessagesTowardSip(contact.uaSim)
            ) {

                try {

                    await sipProxy.sendMessage(
                        contact,
                        message.fromNumber,
                        types.misc.smuggleBundledDataInHeaders(message.bundledData),
                        message.text
                    );

                } catch (error) {

                    debug("sip Send Message error:", error.message);
                    return;

                }

                onReceived();

            }

        }
    );

}

export namespace sendMessagesOfContact {
    export const lock = new AsyncLock();
}

