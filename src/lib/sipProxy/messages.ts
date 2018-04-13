import { SyncEvent } from "ts-events-extended";
import { Ami } from "ts-ami";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
//TODO: Create issue on Typescript repository.
dcMisc;
import * as sipLibrary from "ts-sip";
import * as types from "../types";

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

        Ami.getInstance().messageSend(
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

//From here functions are not exported outside sipProxy


/** 
 * Must be called before the first connection to backend 
 * and after DongleController have been instantiated
 * 
 * not exported
 * 
 * */
export async function init() {

    let ami= Ami.getInstance();

    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, dialplanContext);

    await ami.dialplanExtensionAdd(dialplanContext, matchAllExt, 1, "Hangup");
}

export function onNewAsteriskSocket(
    asteriskSocket: sipLibrary.Socket, 
    prContact: Promise<types.Contact>
) {

    asteriskSocket.evtRequest.attachPrepend(
        sipLibrary.isPlainMessageRequest,
        sipRequestAsReceived =>
            onOutgoingSipMessage(
                sipRequestAsReceived,
                asteriskSocket.evtPacketPreWrite.waitFor(
                    sipPacketNextHop => (
                        !sipLibrary.matchRequest(sipPacketNextHop) &&
                        sipLibrary.isResponse(sipRequestAsReceived, sipPacketNextHop)
                    ), 5000
                )
            )
    );

    asteriskSocket.evtPacketPreWrite.attach(
        (sipPacketNextHop): sipPacketNextHop is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacketNextHop) &&
            sipLibrary.isPlainMessageRequest(sipPacketNextHop, "WITH AUTH")
        ),
        sipRequestNextHop => asteriskSocket.evtResponse.attachOnce(
            sipResponse => sipLibrary.isResponse(sipRequestNextHop, sipResponse),
            async ({ status }) => {

                if (status !== 202) { return; }

                onIncomingSipMessage(await prContact, sipRequestNextHop);

            }
        )
    );

}

/** 
 * Need to be call by sipRouter when a SIP MESSAGE packet is emitted by asterisk.
 * 
 * @param sipRequestAsReceived Must be the sipRequest as sent by asterisk.
 * This calling this method will cause the message to be updated.
 * Even if the received packet should never be altered by the sipProxy
 * it is ok in this case as this module act as a middleware between Asterisk and 
 * the semasim gateway.
 * @param prSipResponse promise that resolve if a response is received from UA or reject
 * if no response have been received in a reasonable amount of time.
 * 
 */
//export function onOutgoingSipMessage(
function onOutgoingSipMessage(
    sipRequestAsReceived: sipLibrary.Request,
    prSipResponse: Promise<any>
): void {

    sendMessage.evtOutgoingMessage.post({
        "sipRequest": sipRequestAsReceived,
        prSipResponse
    });

}

/**
 * 
 * Must be called by sipProxy router when we received from backend a SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain
 * 
 * @param fromContact the contact the message come from
 * @param sipRequest the MESSAGE sipRequest 
 * the message will not be modified.
 * 
 */
function onIncomingSipMessage(
    fromContact: types.Contact,
    sipRequest: sipLibrary.Request
) {

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

