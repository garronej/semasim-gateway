import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";
import { Contact } from "./sipContact";
import { evtOutgoingMessage, evtIncomingMessage } from "./sipProxy";
import * as sipLibrary from "../tools/sipLibrary";
import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_sipMessage");

export const evtMessage = new SyncEvent<{
    fromContact: Contact;
    toNumber: string;
    text: string;
}>();

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


export async function startAccepting() {

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

            evtMessage.post({ fromContact, toNumber, text });

        }
    );

}


export function sendMessage(
    contact: Contact,
    from_number: string,
    headers: Record<string, string>,
    text: string,
    from_number_sim_name?: string
): Promise<void> {

    return new Promise<void>(
        async (resolve, reject) => {

            //debug("sendMessage", { contact, from_number, headers, text, from_number_sim_name });

            let actionId = Ami.generateUniqueActionId();

            let uri = contact.path.split(",")[0].match(/^<(.*)>$/)![1].replace(/;lr/, "");

            DongleExtendedClient.localhost().ami.messageSend(
                `pjsip:${contact.endpoint}/${uri}`, from_number, actionId
            ).catch(amiError => {

                let error= sendMessage.errors.notSent;

                error.name= amiError.name;
                error.message= amiError.message;
                Object.defineProperty(error, "stack", { "value": amiError.stack });

                reject(error);

            });

            let sipRequest: sipLibrary.Request;
            let evtReceived: VoidSyncEvent;

            try {

                let outgoingMessage = await evtOutgoingMessage.waitFor(
                    ({ sipRequest }) => sipRequest.content === actionId,
                    sendMessage.timeouts.intercept
                );

                sipRequest = outgoingMessage.sipRequest;
                evtReceived = outgoingMessage.evtReceived;

            } catch (error) {
                reject(sendMessage.errors.notIntercepted);
                return;
            }

            if (from_number_sim_name) sipRequest.headers.from.name = `"${from_number_sim_name} (sim)"`;

            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };

            delete sipRequest.headers.contact;

            sipRequest.content = stringToUtf8EncodedDataAsBinaryString(text);

            sipRequest.headers = { ...sipRequest.headers, ...headers };

            try{

                await evtReceived.waitFor(sendMessage.timeouts.accepted);

            }catch(error){

                reject(sendMessage.errors.notConfirmed);
                return;

            }

            resolve();


        }
    );

}

export namespace sendMessage {

    export const timeouts ={
        "intercept": 2000,
        "accepted": 5000
    };

    export const errors= {
        "notSent": new Error(),
        "notIntercepted": new Error(`Message could not be intercepted in sip proxy, timeout value: ${timeouts.intercept}`),
        "notConfirmed": new Error(`UA did not confirm reception of message, timeout value: ${timeouts.accepted}`)
    }
}
