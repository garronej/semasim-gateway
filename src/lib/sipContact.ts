import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import * as sipLibrary from "../tools/sipLibrary";
import * as db from "./db";
import { getAsteriskSockets } from "./sipProxy";
import * as sipApiBackend from "./sipApiClientBackend";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_sipContact");


export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}

export namespace PsContact {

    export function buildUserAgentFieldValue(
        instanceId: string,
        userAgent: string
    ): string {
        let wrap = { instanceId, userAgent };
        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64");
    }

    function decodeUserAgentFieldValue(psContact: PsContact): {
        instanceId: string,
        userAgent: string
    } {
        return JSON.parse((new Buffer(psContact.user_agent, "base64")).toString("utf8"));
    }

    function readFlowToken(psContact: PsContact): string {
        return sipLibrary.parsePath(psContact.path).pop()!.uri.params[c.shared.flowTokenKey]!;
    }

    function extractPushInfos(psContact: PsContact): {
        pushType: string | undefined;
        pushToken: string | undefined;
    } {

        let { params } = sipLibrary.parseUri(psContact.uri);

        let pushType = params["pn-type"] || undefined;
        let pushToken = params["pn-tok"] || undefined;

        return { pushType, pushToken };

    }

    export function buildContact(psContact: PsContact): Contact {

        psContact.uri = psContact.uri.replace(/\^3B/g, ";");
        psContact.path = psContact.path.replace(/\^3B/g, ";");

        let { instanceId, userAgent } = decodeUserAgentFieldValue(psContact);

        let flowToken = readFlowToken(psContact);

        let pushInfos = extractPushInfos(psContact);

        /*
        let pretty = [
            `imei: ${psContact.endpoint}`,
            `+sip.instance: ${instanceId}`,
            `flowToken: ${flowToken}`
        ].join(",");
        */

        let pretty = `flowToken: ${flowToken}`;

        return {
            "ps": psContact,
            pushInfos,
            "uaInstance": {
                "dongle_imei": psContact.endpoint,
                "instance_id": instanceId
            },
            userAgent,
            flowToken,
            pretty
        };
    }
}

export interface Contact {
    readonly ps: PsContact;
    readonly pushInfos: {
        readonly pushType: string | undefined;
        readonly pushToken: string | undefined;
    };
    readonly uaInstance: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    };
    readonly userAgent: string;
    readonly flowToken: string;
    readonly pretty: string;
}

export function buildDialString(contacts: Iterable<Contact>) {

    let dialStringSplit: string[] = [];

    for (let { ps } of contacts)
        dialStringSplit.push(`PJSIP/${ps.endpoint}/${ps.uri}`);

    return dialStringSplit.join("&");

}

export function wakeUpAllContactsOfEndpoint(
    endpoint: string,
    getResultTimeout: number = 9000,
) {
    return new Promise<{
        reachableContacts: Set<Contact>;
        unreachableContacts: Set<Contact>;
    }>(async resolve => {

        let reachableContacts = new Set<Contact>();
        let unreachableContacts = new Set<Contact>(
            (await db.asterisk.queryContacts()).filter(
                contact => contact.ps.endpoint === endpoint
            )
        );

        let resolver = () => {
            resolve({ reachableContacts, unreachableContacts });
            reachableContacts = new Set();
            unreachableContacts = new Set();
        };

        let timeoutId = setTimeout(
            () => {
                if (!reachableContacts.size) return;
                resolver();
            },
            getResultTimeout
        );

        let tasks: Promise<void>[] = [];

        for (let contact of unreachableContacts) {
            tasks[tasks.length] = (async () => {

                switch (await sipApiBackend.wakeUpUserAgent.makeCall(contact)) {
                    case "REACHABLE":
                        unreachableContacts.delete(contact);
                        reachableContacts.add(contact);
                        return;
                    case "PUSH_NOTIFICATION_SENT":
                        try {
                            let reachableContact = await db.asterisk.getEvtNewContact().waitFor(
                                reRegisteredContact =>
                                    JSON.stringify(reRegisteredContact.uaInstance) === JSON.stringify(contact.uaInstance),
                                15000
                            );
                            unreachableContacts.delete(contact);
                            reachableContacts.add(reachableContact);
                        } catch (error) { }
                }

            })();
        }

        await Promise.all(tasks);

        clearTimeout(timeoutId);

        resolver();

    });


}


