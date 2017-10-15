import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "./db";
import * as AsyncLock from "async-lock";
import * as sipApiBackend from "./sipApiClientBackend";
import { Contact } from "./sipContact";
import * as sipMessage from "./sipMessage";

import * as _debug from "debug";
let debug = _debug("_messageQueue");

const checkMark = (new Buffer("e29c94", "hex")).toString("utf8");
const crossMark = (new Buffer("e29d8c", "hex")).toString("utf8");

const lockDongle = new AsyncLock();

export function sendMessagesOfDongle(
    endpoint: Contact.UaEndpoint.EndpointRef
) {
    lockDongle.acquire(endpoint.dongle.imei, async () => {

        let dc = Dc.getInstance();

        for (
            let [message, { setSent, setStatusReport }]
            of await db.semasim.MessageTowardGsm.getUnsent(endpoint)
        ) {

            let sendMessageResult: Dc.SendMessageResult;

            try {

                sendMessageResult = await dc.sendMessage(
                    endpoint.dongle.imei,
                    message.to_number,
                    message.text
                );

            } catch {
                return;
            }

            if (!sendMessageResult.success) {

                if (sendMessageResult.reason !== "DISCONNECT") {
                    await setSent(null);
                    continue;
                }else{
                    return;
                }

            }

            let { sendDate } = sendMessageResult;

            let prSetSent = setSent(sendDate);

            db.semasim.MessageTowardSip.add(
                message.to_number,
                checkMark,
                sendDate,
                true,
                {
                    "is": "UA_ENDPOINT",
                    "uaEndpoint": message.uaEndpoint
                }
            ).then(() => notifyNewSipMessagesToSend(message.uaEndpoint.endpoint));

            dc.evtStatusReport.attachOnce(
                ({ statusReport }) => statusReport.sendDate.getTime() === sendDate.getTime(),
                async ({ statusReport }) => {

                    await prSetSent;

                    setStatusReport(statusReport);

                    if (statusReport.isDelivered) {

                        //TODO: may be useless...depend of operator I assume
                        if( isNaN(statusReport.dischargeDate.getTime())){
                            statusReport.dischargeDate= new Date();
                        };

                        await db.semasim.MessageTowardSip.add(
                            message.to_number,
                            `${checkMark}${checkMark}`,
                            statusReport.dischargeDate,
                            true,
                            {
                                "is": "UA_ENDPOINT",
                                "uaEndpoint": message.uaEndpoint
                            }
                        );

                        await db.semasim.MessageTowardSip.add(
                            message.to_number,
                            `you sent from ${message.uaEndpoint.ua.software}:\n${message.text}`,
                            sendDate,
                            true,
                            {
                                "is": "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA",
                                "endpoint": message.uaEndpoint.endpoint,
                                "excludeUa": message.uaEndpoint.ua
                            }
                        );

                    } else {

                        await db.semasim.MessageTowardSip.add(
                            message.to_number,
                            crossMark,
                            statusReport.dischargeDate,
                            true,
                            {
                                "is": "UA_ENDPOINT",
                                "uaEndpoint": message.uaEndpoint
                            }
                        );

                    }

                    notifyNewSipMessagesToSend(message.uaEndpoint.endpoint);

                }
            );

        }

    });
}

export function notifyNewSipMessagesToSend(
    fromEndpoint: Contact.UaEndpoint.EndpointRef
) {

    db.asterisk.getContacts(fromEndpoint).then(
        contacts => contacts.forEach(
            async contact => {

                let unsentCount = await db.semasim.MessageTowardSip.unsentCount(contact.uaEndpoint);

                if (!unsentCount) return;

                let status = await sipApiBackend.wakeUpContact.makeCall(contact);

                if (status !== "REACHABLE") return;

                sendMessagesOfContact(contact);

            }
        )
    );
}

const lockUaEndpoint = new AsyncLock();
export function sendMessagesOfContact(contact: Contact) {

    let { uaEndpoint } = contact;

    lockUaEndpoint.acquire(
        Contact.UaEndpoint.id(uaEndpoint),
        async () => {

            for (
                let [message, setReceived]
                of
                await db.semasim.MessageTowardSip.getUnsent(uaEndpoint)
            ) {

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
                    return;
                }
                setReceived();

            }

        }
    );

}
