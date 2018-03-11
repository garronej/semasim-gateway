import { SyncEvent } from "ts-events-extended";
import {
    DongleController as Dc,
    Ami
} from "chan-dongle-extended-client";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as sipLibrary from "../../../tools/sipLibrary";
import * as types from "./../../types";

import * as _debug from "debug";
let debug = _debug("_sipProxy/messages");

export const dialplanContext = "from-sip-message";

export const evtMessage = new SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date | undefined;
}>();

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

        sendMessage.evtOutgoingMessage.attachOnce(
            ({ sipRequest }) =>
                sipLibrary.getPacketContent(sipRequest).toString("utf8") === actionId,
            2000,
            ({ sipRequest, prSipResponse }) => {

                if (fromNumberSimName) {
                    sipRequest.headers.from.name = `"${fromNumberSimName} (sim)"`;
                }

                sipRequest.headers.route = sipLibrary.parsePath(contact.path);

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

export namespace sendMessage {

    export const evtOutgoingMessage = new SyncEvent<{
        sipRequest: sipLibrary.Request;
        prSipResponse: Promise<void>
    }>();

}


//From here protected

/** 
 * Must be called before the first connection to backend 
 * and after DongleController have been instantiated
 * */
export async function initDialplan() {

    let ami = Dc.getInstance().ami;

    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, dialplanContext);

    await ami.dialplanExtensionAdd(dialplanContext, matchAllExt, 1, "Hangup");

}

/** 
 * Need to be call by sipRouter when a SIP MESSAGE packet is emitted by asterisk.
 * 
 * @param sipRequestNextHop must be the packet that will be sent to the gateway to the backend.
 * This calling this method will cause the message to be updated.
 * @param prSipResponse promise that resolve if a response is received from UA or reject
 * if no response have been received in a reasonable amount of time.
 * 
 */
export function onOutgoingSipMessage(
    sipRequestNextHop: sipLibrary.Request,
    prSipResponse: Promise<any>
): void {

    sendMessage.evtOutgoingMessage.post({
        "sipRequest": sipRequestNextHop,
        prSipResponse
    });

}

/**
 * 
 * Must be called by sipRouter when we received from backend an SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain
 * 
 * @param fromContact the contact the message come from
 * @param sipRequestReceived the sipRequest as received from the backend,
 * the message will not be modified.
 * 
 */
export function onIncomingSipMessage(
    fromContact: types.Contact,
    sipRequestReceived: sipLibrary.Request
) {

    let content = sipLibrary.getPacketContent(sipRequestReceived);

    let text = content.toString("utf8");

    if (!content.equals(Buffer.from(text, "utf8"))) {
        debug("Sip message content was not a valid UTF-8 string");
    }

    let toNumber = sipLibrary.parseUri(sipRequestReceived.headers.to.uri).user!;

    let exactSendDate: Date | undefined;

    try {

        exactSendDate = (types.misc.extractBundledDataFromHeaders(
            sipRequestReceived.headers
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

