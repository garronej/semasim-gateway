import { DongleExtendedClient, typesDef as t } from "chan-dongle-extended-client";
import * as db from "./db";
import * as AsyncLock from "async-lock";
import * as sipApiBackend from "./sipApiClientBackend";
import { Contact } from "./sipContact";
import * as sipMessage from "./sipMessage";

import * as _debug from "debug";
let debug = _debug("_messagesDispatcher");

const lock1 = new AsyncLock();
export function sendDonglePendingMessages(imei: string) {

    lock1.acquire(imei, async () => {

        let messages = await db.semasim.getUnsentMessageOfDongleSim(imei);

        let messByNum = new Map<string, typeof messages>();

        for (let message of messages) {

            let { to_number } = message;

            if (!messByNum.has(to_number)) messByNum.set(to_number, []);

            messByNum.get(to_number)!.push(message);

        }

        let tasks: Promise<void>[] = [];

        for (let messages of messByNum.values()) {

            tasks[tasks.length] = (async () => {

                for (let message of messages) {

                    let { id, sender, to_number, text } = message;

                    let sentMessageId: number;

                    try {
                        sentMessageId = await DongleExtendedClient.localhost().sendMessage(
                            imei,
                            to_number,
                            text
                        );
                    } catch (error) {

                        if (error.message !== t.errorMessages.messageNotSent) return;

                        sentMessageId = 0;

                    }

                    await db.semasim.setMessageToGsmSentId(id, sentMessageId);

                    if (sentMessageId) {

                        await db.semasim.addMessageTowardSip(
                            to_number,
                            `---Message send, sentMessageId: ${sentMessageId}---`,
                            new Date(),
                            { "uaInstance": sender }
                        );

                    } else {

                        await db.semasim.addMessageTowardSip(
                            to_number,
                            `Error message not sent`,
                            new Date(),
                            { "uaInstance": sender }
                        );

                    }

                    notifyNewSipMessagesToSend();
                }

            })();

        }

        await Promise.all(tasks);

    });

}

const lock2 = new AsyncLock();
export function sendPendingSipMessagesToReachableContact(contact: Contact) {

    let { uaInstance } = contact;

    lock2.acquire(JSON.stringify(uaInstance), async () => {

        let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(uaInstance);

        for (let message of messages) {
            debug(`sip sending: ${JSON.stringify(message.text)} from ${message.from_number}`);
            try {
                await sipMessage.sendMessage(
                    contact,
                    message.from_number,
                    {},
                    message.text
                );
            } catch (error) {
                debug("sip Send Message error:", error.message);
                //TODO: force contact to re register
                break;
            }
            await db.semasim.setMessageTowardSipDelivered(uaInstance, message.id);
        }

    });

}

export function notifyNewSipMessagesToSend() {

    db.asterisk.queryContacts().then(
        contacts => contacts.forEach(
            async contact => {

                let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(contact.uaInstance);

                if (!messages.length) return;

                let status = await sipApiBackend.wakeUpUserAgent.makeCall(contact);

                if (status !== "REACHABLE") return;

                sendPendingSipMessagesToReachableContact(contact);

            }
        )
    );
}