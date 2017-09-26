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
    }{
        return JSON.parse((new Buffer(psContact.user_agent, "base64")).toString("utf8"));
    }

    function readFlowToken(psContact: PsContact): string {
        return sipLibrary.parsePath(psContact.path).pop()!.uri.params[c.shared.flowTokenKey]!;
    }

    function extractPushInfos( psContact: PsContact): { 
        pushType: string | undefined; 
        pushToken: string | undefined; 
    }{

        let { params } = sipLibrary.parseUri(psContact.uri);

        let pushType= params["pn-type"] || undefined;
        let pushToken = params["pn-tok"] || undefined;

        return { pushType, pushToken };

    }

    export function buildContact(psContact: PsContact): Contact {

        psContact.uri = psContact.uri.replace(/\^3B/g, ";");
        psContact.path = psContact.path.replace(/\^3B/g, ";");

        let { instanceId, userAgent }= decodeUserAgentFieldValue(psContact);

        let flowToken= readFlowToken(psContact);

        let pushInfos= extractPushInfos(psContact);

        let pretty=[
            `imei: ${psContact.endpoint}`,
            `+sip.instance: ${instanceId}`,
            `flowToken: ${flowToken}`
        ].join(",");

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


export namespace Contact {

    export function buildDialString(contacts: Iterable<Contact>){

        let dialStringSplit: string[]=[];

        for( let {ps} of contacts)
            dialStringSplit.push(`PJSIP/${ps.endpoint}/${ps.uri}`);
        
        return dialStringSplit.join("&");

    }

    export function getContactOfFlow(
        flowToken: string
    ) {
        return new Promise<Contact | undefined>(
            async resolve => {

                let returned = false;

                getEvtNewContact().waitFor(
                    contact => contact.flowToken === flowToken,
                    1200
                ).then(contact => {
                    if (returned) return;
                    returned = true;
                    resolve(contact);
                }).catch(() => {
                    if (returned) return;
                    returned = true;
                    resolve(undefined);
                });

                let contacts = await db.asterisk.queryContacts();

                if (returned) return;

                let contact = contacts.find(
                    contact => contact.flowToken === flowToken
                );

                if (!contact) return;

                returned = true;
                resolve(contact);

            }
        );
    }

    export function wakeUpAllContacts(
        endpoint: string,
        getResultTimeout?: number,
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

            let resolver= ()=> {
                resolve({ reachableContacts, unreachableContacts });
                reachableContacts= new Set();
                unreachableContacts= new Set();
            };

            let timeoutId = setTimeout(
                ()=>{
                    if( !reachableContacts.size ) return;
                    resolver();
                },
                getResultTimeout || 9000
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
                                let reachableContact = await getEvtNewContact().waitFor(
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


    let evtNewContact: SyncEvent<Contact> | undefined = undefined;
    export function getEvtNewContact() {

        if (evtNewContact) return evtNewContact;

        evtNewContact = new SyncEvent<Contact>();

        db.asterisk.getEvtNewContact().attach(
            async newContact => {

                let oldContact = (await db.asterisk.queryContacts()).find(
                    oldContact => (
                        oldContact.ps.id !== newContact.ps.id &&
                        JSON.stringify(oldContact.uaInstance) === JSON.stringify(newContact.uaInstance)
                    )
                );

                if (oldContact) {

                    debug(`We overwrite contact ${oldContact.pretty}`);

                    await db.asterisk.deleteContact(oldContact);

                    let oldAsteriskSocket = (await getAsteriskSockets()).get(oldContact.flowToken);

                    if (oldAsteriskSocket) oldAsteriskSocket.destroy();

                }

                evtNewContact!.post(newContact);

            }
        );

        return evtNewContact;

    }


    let evtExpiredContact: SyncEvent<Contact> | undefined = undefined;
    export function getEvtExpiredContact() {

        if (evtExpiredContact) return evtExpiredContact;

        evtExpiredContact = new SyncEvent<Contact>();

        db.asterisk.getEvtExpiredContact().attach(
            async expiredContact=> {

                    let asteriskSocket = (await getAsteriskSockets()).get(expiredContact.flowToken);

                    if (asteriskSocket) asteriskSocket.destroy();

                    evtExpiredContact!.post(expiredContact);

            }
        );

        return evtExpiredContact;

    }

}
