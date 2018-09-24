import * as AsyncLock from "async-lock";
import {
    DongleController as Dc,
    types as dcTypes
} from "chan-dongle-extended-client";
import * as dbSemasim from "./dbSemasim";
import * as types from "./types";
import * as misc from "./misc";
import * as logger from "logger";
import * as sipContactsMonitor from "./sipContactsMonitor";
import * as backendRemoteApiCaller from "./toBackend/remoteApiCaller";
import * as sipMessagesMonitor from "./sipMessagesMonitor";

const debug = logger.debugFactory();

export function sendMessagesOfDongle(
    dongle: dcTypes.Dongle.Usable
) {

    sendMessagesOfDongle.lock.acquire(dongle.imei, async () => {

        const dc = Dc.getInstance();

        for (
            let [message, { onSent, onStatusReport }] of
            await dbSemasim.getUnsentMessagesTowardGsm(dongle.sim.imsi)
        ) {

            let sendMessageResult: dcTypes.SendMessageResult;

            try {

                //TODO: Dial with the number it was guessed from.
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

    for (const contact of sipContactsMonitor.getContacts(imsi)) {

        if (!(await dbSemasim.messageTowardSipUnsentCount(contact.uaSim))) {
            continue;
        }

        if (
            (await backendRemoteApiCaller.wakeUpContact(contact))
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
        misc.generateUaSimId(contact.uaSim),
        async () => {

            for (
                let [message, onReceived] of
                await dbSemasim.getUnsentMessagesTowardSip(contact.uaSim)
            ) {

                try {

                    await sipMessagesMonitor.sendMessage(
                        contact,
                        message.fromNumber,
                        misc.smuggleBundledDataInHeaders(message.bundledData),
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

