import * as sipLibrary from "../../tools/sipLibrary";
import * as dbAsterisk from "../db/asterisk";
import * as types from "../types";
import * as backendSocket from "./backendSocket";
import { SyncEvent } from "ts-events-extended";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/asteriskSockets");

export const evtContactRegistration = new SyncEvent<types.Contact>();

/** map connectionId+imsi => asteriskSocket */
const map = new Map<string, sipLibrary.Socket | null>();

export namespace _protected {

    export type Key= { connectionId: string; imsi: string };

    export namespace Key {
        export function getId(key: Key): string {
            return `${key.connectionId};${key.imsi}`;
        }
    }

    export function set(
        key: Key,
        socket: sipLibrary.Socket
    ) {

        map.set(Key.getId(key), socket);

        socket.evtClose.attachOncePrepend(() => map.set(Key.getId(key), null));

        let { connectionId, imsi }= key;

        socket.misc["__prContact__"] = new Promise<types.Contact>(
            resolve =>
                dbAsterisk.evtNewContact.waitFor(
                    contact => (
                        contact.connectionId === connectionId &&
                        contact.uaSim.imsi === imsi
                    ),
                    6001
                ).then(contact => {

                    const boundTo = [];

                    socket.evtClose.attachOnce(() => {
                        dbAsterisk.evtExpiredContact.detach(boundTo);
                        dbAsterisk.deleteContact(contact);
                    });

                    dbAsterisk.evtExpiredContact.attachOnce(
                        expiredContact => expiredContact.id === contact.id,
                        boundTo,
                        () => {
                            debug("expired contact");
                            socket.destroy();
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

                    socket.misc["__contact__"] = contact;

                    evtContactRegistration.post(contact);

                    resolve(contact);

                }).catch(() => socket.destroy())
        );

    }

    /** null represent an expired connection */
    export function get(
        key: Key
    ): sipLibrary.Socket | null | undefined {
        return map.get(Key.getId(key));
    }

    export function getSocketContact(
        socket: sipLibrary.Socket
    ): types.Contact | Promise<types.Contact> {
        return socket.misc["__contact__"] || socket.misc["__prContact__"];
    }

}



function getContactMap(): Map<sipLibrary.Socket, types.Contact | undefined> {

    let out = new Map<sipLibrary.Socket, types.Contact | undefined>();

    for (let socket of map.values()) {

        if (socket === null) {
            continue;
        }

        out.set(socket, (() => {

            let contact = _protected.getSocketContact(socket);

            return (contact instanceof Promise) ? undefined : contact;


        })());


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

export function flush(imsi?: string): void {

    for (let [socket, contact] of getContactMap()) {

        if (!imsi || !contact || contact.uaSim.imsi === imsi) {
            socket.destroy();
        }

    }

}

