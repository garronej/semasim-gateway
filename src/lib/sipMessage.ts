import { SyncEvent } from "ts-events-extended";
import { DongleController as Dc, Ami } from "chan-dongle-extended-client";
import { Contact } from "./sipContact";
import { evtOutgoingMessage, evtIncomingMessage } from "./sipProxy";
import * as sipLibrary from "../tools/sipLibrary";
import { c } from "./_constants";
import * as phone from "../tools/phoneNumberLibrary";

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

        let ami = Dc.getInstance().ami;

        let matchAllExt = "_.";

        await ami.dialplanExtensionRemove(matchAllExt, c.sipMessageContext);

        await ami.dialplanExtensionAdd(c.sipMessageContext, matchAllExt, 1, "Hangup");

        evtIncomingMessage.attach(
            ({ fromContact, sipRequest }) => {

                let { isValidInput, text } = utf8EncodedDataAsBinaryStringToString(sipRequest.content);

                if (!isValidInput)
                    debug("Sip message content was not a valid UTF-8 string");

                let toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user!;

                evtMessage!.post({ fromContact, toNumber, text });

            }
        );

    })();

    return evtMessage;

}


/*

TODO: consider: 

 Apply patch for overighting Content-Type in outgoing SIP message 

Patch ref: https://issues.asterisk.org/jira/browse/ASTERISK-26082


*/

export function sendMessage(
    contact: Contact,
    from_number: string,
    headers: Record<string, string>,
    text: string,
    from_number_sim_name?: string
) {
    return new Promise<void>((resolve, reject) => {

        let actionId = Ami.generateUniqueActionId();

        let uri = contact.path.split(",")[0].match(/^<(.*)>$/)![1].replace(/;lr/, "");

        from_number = phone.toNationalNumber(from_number, contact.uaEndpoint.endpoint.sim.imsi);

        Dc.getInstance().ami.messageSend(
            `pjsip:${contact.uaEndpoint.endpoint.dongle.imei}/${uri}`, from_number, actionId
        ).catch(amiError => reject(amiError));

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            2000,
            ({ sipRequest, prSipResponse }) => {

                if (from_number_sim_name) sipRequest.headers.from.name = `"${from_number_sim_name} (sim)"`;

                sipRequest.uri = contact.uri;
                sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };

                delete sipRequest.headers.contact;

                sipRequest.content = stringToUtf8EncodedDataAsBinaryString(text);

                sipRequest.headers = { ...sipRequest.headers, ...headers };

                prSipResponse
                    .then(() => resolve())
                    .catch(() => reject(new Error("Not received")));


            }
        ).catch(() => reject(new Error("Not intercepted")));

    });

}



function utf8EncodedDataAsBinaryStringToString(
    utf8EncodedDataAsBinaryString: string
): { isValidInput: boolean; text: string; } {

    let uft8EncodedData = new Buffer(utf8EncodedDataAsBinaryString, "binary");

    let text = uft8EncodedData.toString("utf8");

    let isValidInput = uft8EncodedData.equals(new Buffer(text, "utf8"));

    return { isValidInput, text };

}

function stringToUtf8EncodedDataAsBinaryString(text: string): string {

    return (new Buffer(text, "utf8")).toString("binary");

}