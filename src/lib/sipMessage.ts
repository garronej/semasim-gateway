import { SyncEvent } from "ts-events-extended";
import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";
import { Contact } from "./sipContact";
import { evtOutgoingMessage, evtIncomingMessage } from "./sipProxy";
import * as sipLibrary from "../tools/sipLibrary";
import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_sipMessage");

let evtMessage: SyncEvent<{
    fromContact: Contact;
    toNumber: string;
    text: string;
}> | undefined = undefined;

export function getEvtMessage() {

    if (evtMessage) return evtMessage;

    evtMessage = new SyncEvent();

    (async () => {

        let ami = DongleExtendedClient.localhost().ami;

        let matchAllExt = "_.";

        await ami.dialplanExtensionRemove(matchAllExt, c.sipMessageContext);

        await ami.dialplanExtensionAdd(c.sipMessageContext, matchAllExt, 1, "Hangup");

        evtIncomingMessage.attach(
            ({ fromContact, sipRequest }) => {

                let { validInput, text } = utf8EncodedDataAsBinaryStringToString(sipRequest.content);

                if (!validInput)
                    debug("Sip message content was not a valid UTF-8 string");

                let toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user!;

                evtMessage!.post({ fromContact, toNumber, text });

            }
        );

    })();

    return evtMessage;

}



export function sendMessage(
    contact: Contact,
    from_number: string,
    headers: Record<string, string>,
    text: string,
    from_number_sim_name?: string
) {
    return new Promise<void>((resolve, reject) => {

        let actionId = Ami.generateUniqueActionId();

        let uri = contact.ps.path.split(",")[0].match(/^<(.*)>$/)![1].replace(/;lr/, "");

        DongleExtendedClient.localhost().ami.messageSend(
            `pjsip:${contact.ps.endpoint}/${uri}`, from_number, actionId
        ).catch(amiError => {

            let error = sendMessage.errors.notSent;

            error.name = amiError.name;
            error.message = amiError.message;
            Object.defineProperty(error, "stack", { "value": amiError.stack });

            reject(error);

        });

        let timeoutInterceptId = setTimeout(
            () => reject(sendMessage.errors.notIntercepted),
            sendMessage.timeouts.intercept
        );

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            ({ sipRequest, evtReceived }) => {

                clearTimeout(timeoutInterceptId);

                if (from_number_sim_name) sipRequest.headers.from.name = `"${from_number_sim_name} (sim)"`;

                sipRequest.uri = contact.ps.uri;
                sipRequest.headers.to = { "name": undefined, "uri": contact.ps.uri, "params": {} };

                delete sipRequest.headers.contact;

                sipRequest.content = stringToUtf8EncodedDataAsBinaryString(text);

                sipRequest.headers = { ...sipRequest.headers, ...headers };

                evtReceived
                    .waitFor(sendMessage.timeouts.confirmed)
                    .catch(() => reject(sendMessage.errors.notConfirmed))
                    .then(() => resolve());

            }
        );

    });

}

export namespace sendMessage {

    export const timeouts = {
        "intercept": 2000,
        "confirmed": 5000
    };

    export const errors = {
        "notSent": new Error(),
        "notIntercepted": new Error(`Message could not be intercepted in sip proxy, timeout value: ${timeouts.intercept}`),
        "notConfirmed": new Error(`UA did not confirm reception of message, timeout value: ${timeouts.confirmed}`)
    }
}


function utf8EncodedDataAsBinaryStringToString(
    utf8EncodedDataAsBinaryString: string
): {
        validInput: boolean;
        text: string;
    } {

    let uft8EncodedData = new Buffer(utf8EncodedDataAsBinaryString, "binary");

    let text = uft8EncodedData.toString("utf8");

    let validInput = uft8EncodedData.equals(new Buffer(text, "utf8"));

    return { validInput, text };

}

function stringToUtf8EncodedDataAsBinaryString(text: string): string {

    return (new Buffer(text, "utf8")).toString("binary");

}