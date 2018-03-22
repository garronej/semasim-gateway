import * as sipLibrary from "../../tools/sipLibrary";
import * as dbAsterisk from "../db/asterisk";
import * as types from "../types";
import * as backendSocket from "./backendSocket";
import { SyncEvent } from "ts-events-extended";
import * as asteriskSockets from "./asteriskSockets";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/asteriskSockets/contactsRegistrationMonitor");

export const evtContactRegistration = new SyncEvent<types.Contact>();

/** Must be called by router when new asteriskSocket is created */
export function onNewAsteriskSocket(
    asteriskSocket: sipLibrary.Socket,
    { connectionId, imsi }: asteriskSockets.Key
): Promise<types.Contact> {

    return new Promise<types.Contact>(
        resolve =>
            dbAsterisk.evtNewContact.waitFor(
                contact => (
                    contact.connectionId === connectionId &&
                    contact.uaSim.imsi === imsi
                ),
                6001
            ).then(contact => {

                const boundTo = [];

                asteriskSocket.evtClose.attachOnce(() => {
                    dbAsterisk.evtExpiredContact.detach(boundTo);
                    dbAsterisk.deleteContact(contact);
                });

                dbAsterisk.evtExpiredContact.attachOnce(
                    expiredContact => expiredContact.id === contact.id,
                    boundTo,
                    () => {
                        debug("expired contact");
                        asteriskSocket.destroy();
                        backendSocket.remoteApi.forceContactToRegister(contact);
                    }
                );

                for (let [socket_i, contact_i] of getContactMap()) {

                    if (contact_i && types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {

                        debug("ua re-register with an other connection");

                        socket_i.destroy();

                        break;


                    }

                }

                socketContact.set(asteriskSocket, contact);

                evtContactRegistration.post(contact);

                resolve(contact);

            }).catch(() => asteriskSocket.destroy())
    );


}

namespace socketContact {

    let key = "__contact__";

    export function set(
        asteriskSocket: sipLibrary.Socket,
        contact: types.Contact
    ): void {
        asteriskSocket.misc[key] = contact;
    }

    export function get(
        asteriskSocket: sipLibrary.Socket
    ): types.Contact | undefined {
        return asteriskSocket.misc[key];
    }

}


function getContactMap(): Map<sipLibrary.Socket, types.Contact | undefined> {

    let out = new Map<sipLibrary.Socket, types.Contact | undefined>();

    for (let asteriskSocket of asteriskSockets.getAll()) {

        out.set(asteriskSocket, socketContact.get(asteriskSocket));

    }

    return out;

}

export function getContacts(imsi?: string): types.Contact[] {

    let out: types.Contact[] = [];

    for (let contact of getContactMap().values()) {

        if (contact && (!imsi || contact.uaSim.imsi === imsi)) {
            out.push(contact);
        }

    }

    return out;

}

/** Close all asteriskSocket that has a contact registered to a IMSI */
export function discardContactsRegisteredToSim(imsi: string): void {

    for (let [asteriskSocket, contact] of getContactMap()) {

        if (!contact || contact.uaSim.imsi === imsi) {
            asteriskSocket.destroy();
        }

    }

}
