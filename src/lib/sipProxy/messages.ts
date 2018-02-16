
import { SyncEvent } from "ts-events-extended";
import {
    DongleController as Dc,
    Ami
} from "chan-dongle-extended-client";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
import { evtOutgoingMessage, evtIncomingMessage } from "./route";

import * as _debug from "debug";
let debug = _debug("_sipProxy/messages");

export const evtMessage = new SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date | undefined;
}>();

export const sipMessageContext = "from-sip-message";

export async function startHandling() {

    let ami = Dc.getInstance().ami;

    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, sipMessageContext);

    await ami.dialplanExtensionAdd(sipMessageContext, matchAllExt, 1, "Hangup");

    evtIncomingMessage.attach(
        ({ fromContact, sipRequest }) => {

            let content = sipLibrary.getPacketContent(sipRequest);

            let text = content.toString("utf8");

            if (!content.equals(Buffer.from(text, "utf8"))) {
                debug("Sip message content was not a valid UTF-8 string");
            }

            let toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user!;

            let exactSendDate: Date | undefined;

            try {

                exactSendDate = (types.misc.extractBundledDataFromHeaders(
                    sipRequest.headers
                ) as types.BundledData.ClientToServer.Message).exactSendDate;

            } catch{

                exactSendDate = undefined;

            }


            evtMessage.post({
                fromContact,
                toNumber,
                text,
                exactSendDate
            });

        }
    );

}

export function sendMessage(
    contact: types.Contact,
    fromNumber: string,
    headers: Record<string, string>,
    text: string,
    fromNumberSimName?: string
) {
    return new Promise<void>((resolve, reject) => {

        let actionId = Ami.generateUniqueActionId();

        let uri = (() => {

            let parsedUri = sipLibrary.parsePath(contact.path)[0].uri;

            delete parsedUri.params["lr"];

            return sipLibrary.stringifyUri(parsedUri);

        })();

        fromNumber = dcMisc.toNationalNumber(fromNumber, contact.uaSim.imsi);

        Dc.getInstance().ami.messageSend(
            `pjsip:${contact.uaSim.imsi}/${uri}`, fromNumber, actionId
        ).catch(amiError => reject(amiError));

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            2000,
            ({ sipRequest, prSipResponse }) => {

                if (fromNumberSimName) {
                    sipRequest.headers.from.name = `"${fromNumberSimName} (sim)"`;
                }

                sipRequest.uri = contact.uri;

                sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };

                delete sipRequest.headers.contact;

                sipRequest.headers = { ...sipRequest.headers, ...headers };

                sipLibrary.setPacketContent(sipRequest, text);

                prSipResponse
                    .then(() => resolve())
                    .catch(() => reject(new Error("Not received")))
                    ;


            }
        ).catch(() => reject(new Error("Not intercepted")));

    });

}
