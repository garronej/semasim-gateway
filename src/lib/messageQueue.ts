import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "./db";
import * as AsyncLock from "async-lock";
import { Contact } from "./sipContact";
import * as sipMessage from "./sipMessage";
import * as sipProxy from "./sipProxy";

import * as sipApiBackend from "./sipApiBackedClientImplementation";

import * as _debug from "debug";
let debug = _debug("_messageQueue");

const checkMark = (new Buffer("e29c94", "hex")).toString("utf8");
const crossMark = (new Buffer("e29d8c", "hex")).toString("utf8");

const lockDongle = new AsyncLock();
export function sendMessagesOfDongle(
    dongle: Dc.ActiveDongle
) {
    lockDongle.acquire(dongle.imei, async () => {

        let dc = Dc.getInstance();

        for (
            let [message, { setSent, setStatusReport }]
            of await db.semasim.MessageTowardGsm.getUnsent(dongle.sim.imsi)
        ) {

            let sendMessageResult: Dc.SendMessageResult;

            try {

                sendMessageResult = await dc.sendMessage(
                    dongle.imei,
                    message.toNumber,
                    message.text
                );

            } catch {
                return;
            }

            if (!sendMessageResult.success) {

                if (sendMessageResult.reason === "DISCONNECT") {
                    return;
                }else{
                    await setSent(null);
                    continue;
                }

            }

            let { sendDate } = sendMessageResult;

            let prSetSent = setSent(sendDate);

            db.semasim.MessageTowardSip.add(
                message.toNumber,
                checkMark,
                sendDate,
                true,
                {
                    "target": "SPECIFIC UA REGISTERED TO SIM",
                    "uaSim": message.uaSim
                }
            ).then(() => notifyNewSipMessagesToSend(dongle.sim.imsi));

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
                            message.toNumber,
                            `${checkMark}${checkMark}`,
                            statusReport.dischargeDate,
                            true,
                            {
                                "target": "SPECIFIC UA REGISTERED TO SIM",
                                "uaSim": message.uaSim
                            }
                        );

                        await db.semasim.MessageTowardSip.add(
                            message.toNumber,
                            `Me:\n${message.text}`,
                            sendDate,
                            true,
                            {
                                "target": "ALL OTHER UA OF USER REGISTERED TO SIM",
                                "uaSim": message.uaSim
                            }
                        );

                        await db.semasim.MessageTowardSip.add(
                            message.toNumber,
                            `${message.uaSim.ua.userEmail}:\n${message.text}`,
                            sendDate,
                            true,
                            {
                                "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                                "uaSim": message.uaSim
                            }
                        );

                    } else {

                        await db.semasim.MessageTowardSip.add(
                            message.toNumber,
                            crossMark,
                            statusReport.dischargeDate,
                            true,
                            {
                                "target": "SPECIFIC UA REGISTERED TO SIM",
                                "uaSim": message.uaSim
                            }
                        );

                    }

                    notifyNewSipMessagesToSend(dongle.sim.imsi);

                }
            );

        }

    });
}

export async function notifyNewSipMessagesToSend(
    imsi: string
) {

    for( let contact of sipProxy.getContacts(imsi) ){

        if( !(await db.semasim.MessageTowardSip.unsentCount(contact.uaSim)) ){
            continue;
        }

        if( (await sipApiBackend.wakeUpContact(contact)) === "REACHABLE" ){
            sendMessagesOfContact(contact);
        }

    }

}

const lockUaEndpoint = new AsyncLock();
/** Contact must be reachable */
export function sendMessagesOfContact(contact: Contact) {

    lockUaEndpoint.acquire(
        Contact.UaSim.id(contact.uaSim),
        async () => {

            for (
                let [message, setReceived]
                of
                await db.semasim.MessageTowardSip.getUnsent(contact.uaSim)
            ) {

                try {
                    await sipMessage.sendMessage(
                        contact,
                        message.fromNumber,
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
