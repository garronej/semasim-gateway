import { SyncEvent } from "ts-events-extended";
import { Ami } from "ts-ami";

import * as sipLibrary from "ts-sip";
import * as types from "./types";
import * as misc from "./misc";
import * as cryptoLib from "crypto-lib";
import * as dbSemasim from "./dbSemasim";
import { workerThreadPoolId } from "./misc/workerThreadPoolId";

export const dialplanContext = "from-sip-message";

export const evtMessage = new SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date;
    appendPromotionalMessage: boolean;
}>();

export function sendMessage(
    contact: types.Contact,
    fromNumber: string,
    headers: Record<string, string>
) {
    return new Promise<void>((resolve, reject) => {

        let actionId = Ami.generateUniqueActionId();

        let uri = (() => {

            let parsedUri = sipLibrary.parsePath(contact.path)[0].uri;

            delete parsedUri.params["lr"];

            return sipLibrary.stringifyUri(parsedUri);

        })();



        Ami.getInstance().messageSend(
            `pjsip:${contact.uaSim.imsi}/${uri}`, fromNumber, actionId
        ).catch(amiError => reject(amiError));

        sendMessage.evtOutgoingMessage.attachOnce(
            ({ sipRequest }) =>
                sipLibrary.getPacketContent(sipRequest).toString("utf8") === actionId,
            2000,
            ({ sipRequest, prSipResponse }) => {

                sipRequest.headers.route = sipLibrary.parsePath(contact.path);

                sipRequest.uri = contact.uri;

                sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };

                delete sipRequest.headers.contact;

                sipRequest.headers = { ...sipRequest.headers, ...headers };

                sipLibrary.setPacketContent(sipRequest, "| Message payload encrypted in headers |");

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
 * and after Ami have been instantiated.
 * */
export async function init() {

    const ami = Ami.getInstance();

    const matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, dialplanContext);

    await ami.dialplanExtensionAdd(dialplanContext, matchAllExt, 1, "Hangup");
}

/** 
 * Should be called against every new asterisk socket
 * as soon as it is created.
 * prContact should resolve to the sipContact
 * associated to the socket.
 *  */
export function handleAsteriskSocket(
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
 * Need to be called when a SIP MESSAGE packet is emitted by asterisk.
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
 * Must be called when we received from backend a SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain.
 * 
 * @param fromContact the contact the message come from
 * @param sipRequest the MESSAGE sipRequest 
 * the message will not be modified.
 * 
 */
async function onIncomingSipMessage(
    fromContact: types.Contact,
    sipRequest: sipLibrary.Request
) {

    const decryptor = await (async () => {

        const { prDecryptorMap }= onIncomingSipMessage;

        const { imsi } = fromContact.uaSim;

        let prDecryptor = prDecryptorMap.get(imsi);

        if (prDecryptor === undefined) {

            prDecryptor = dbSemasim.getTowardSimKeys(imsi)
                .then(towardSimKeysStr => cryptoLib.rsa.decryptorFactory(
                    cryptoLib.RsaKey.parse(
                        towardSimKeysStr!.decryptKeyStr
                    ),
                    workerThreadPoolId
                ))
                ;

            prDecryptorMap.set(imsi, prDecryptor);

        }

        return prDecryptor;

    })();

    const { exactSendDate, appendPromotionalMessage, text } =
        await misc.extractBundledDataFromHeaders<types.BundledData.ClientToServer.Message>(
            sipRequest.headers,
            decryptor
        );

    evtMessage.post({
        fromContact,
        "toNumber": sipLibrary.parseUri(sipRequest.headers.to.uri).user!,
        text,
        exactSendDate,
        appendPromotionalMessage
    });

}

namespace onIncomingSipMessage {

    export const prDecryptorMap = new Map<string, Promise<cryptoLib.Decryptor>>();

}

