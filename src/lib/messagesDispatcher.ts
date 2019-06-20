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
import * as cryptoLib from "crypto-lib";
import { workerThreadPoolId } from "./misc/workerThreadPoolId";


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

                sendMessageResult = await dc.sendMessage(
                    dongle.imei, 
                    message.toNumber, 
                    message.text + (message.appendPromotionalMessage ? "\n\nSent via Semasim.com" : "")
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

    const encryptor = (() => {

        const { encryptorMap } = sendMessagesOfContact;

        const { towardUserEncryptKeyStr } = contact.uaSim.ua;

        let out = encryptorMap.get(towardUserEncryptKeyStr);

        if (out === undefined) {

            out= cryptoLib.rsa.encryptorFactory(
                cryptoLib.RsaKey.parse(towardUserEncryptKeyStr),
                workerThreadPoolId
            );

            encryptorMap.set(towardUserEncryptKeyStr, out);

        }

        return out;

    })();


    sendMessagesOfContact.lock.acquire(
        misc.generateUaSimId(contact.uaSim),
        async () => {

            for (
                const [message, onReceived] of
                await dbSemasim.getUnsentMessagesTowardSip(contact.uaSim)
            ) {

                try {

                    await sipMessagesMonitor.sendMessage(
                        contact,
                        message.fromNumber,
                        await misc.smuggleBundledDataInHeaders(
                            message.bundledData,
                            encryptor
                        )
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
    export const encryptorMap = new Map<string, cryptoLib.Encryptor>();
}

