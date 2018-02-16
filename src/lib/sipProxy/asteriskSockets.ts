import * as sipLibrary from "../../tools/sipLibrary";
import * as dbAsterisk from "../dbAsterisk";
import * as types from "../types";
import * as sipApiBackend from "./../sipApiBackedClientImplementation";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/asteriskSockets");


export namespace asteriskSockets {

    const map = new Map<string, sipLibrary.Socket | null>();

    export function getContacts(
        imsi?: string
    ): types.Contact[] {

        let match: (contact: types.Contact)=> boolean;

        if( imsi ){
            match= contact=> contact.uaSim.imsi === imsi;
        }else{
            match= ()=> true;
        }

        let contacts: types.Contact[]= [];

        for (let socket of map.values()) {

            if (socket === null) continue;

            let contact = socket.misc["contact"];

            if (!contact) continue;

            if( !match(contact) ) continue;

            contacts.push(contact);

        }

        return contacts;

    }

    export function set(
        connectionId: number,
        imsi: string,
        socket: sipLibrary.Socket
    ) {

        let key = `${connectionId}${imsi}`;

        socket.evtClose.attachOnce(() => map.set(key, null));

        let prContact = dbAsterisk.evtNewContact.attachOncePrepend(
            contact => (
                contact.connectionId === connectionId &&
                contact.uaSim.imsi === imsi
            ),
            6000,
            contact => {

                socket.evtClose.attachOnce(() => {
                    dbAsterisk.evtExpiredContact.detach(prContact);
                    dbAsterisk.deleteContact(contact);
                });

                dbAsterisk.evtExpiredContact.attachOnce(
                    expiredContact => expiredContact.id === contact.id,
                    prContact,
                    () => {
                        debug("expired contact");
                        socket.destroy();
                        sipApiBackend.forceContactToRegister(contact);
                    }
                );

                for (let socket_i of map.values()) {

                    if (socket_i === null) continue;

                    let contact_i: types.Contact | undefined = socket_i.misc["contact"];

                    if (!contact_i) continue;

                    if (types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {

                        debug("ua re-register with an other connection");

                        socket_i.destroy();

                        break;

                    }

                }

                socket.misc["contact"] = contact;

            }
        );

        prContact.catch(() => socket.destroy());

        socket.misc["prContact"] = prContact;

        map.set(key, socket);

    }

    export function get(
        connectionId: number,
        imsi: string
    ): sipLibrary.Socket | null | undefined {
        return map.get(`${connectionId}${imsi}`);
    }

    export function getContact(
        socket: sipLibrary.Socket
    ): types.Contact | Promise<types.Contact> {
        return socket.misc["contact"] || socket.misc["prContact"];
    }

    export function flush() {

        for (let socket of map.values()) {
            if (socket === null) continue;
            socket.destroy();
        }

    }

}
