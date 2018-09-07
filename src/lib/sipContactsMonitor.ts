import * as sipLibrary from "ts-sip";
import * as types from "./types";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as misc from "./misc";
import * as backendRemoteApiCaller from "./toBackend/remoteApiCaller";
import * as dbAsterisk from "./dbAsterisk";

//TODO: create proxy
export const evtContactRegistration = new SyncEvent<types.Contact>();

export function getContacts(imsi?: string): types.Contact[] {
    return contacts.get()
        .filter(({ contact }) => !!imsi ? (contact.uaSim.imsi === imsi) : true)
        .map(({ contact }) => contact);
}

/** Close all asteriskSocket that has a contact registered to a IMSI */
export function discardContactsRegisteredToSim(imsi: string): void {

    for (let { contact, asteriskSocket } of contacts.get()) {

        if (contact.uaSim.imsi === imsi) {

            asteriskSocket.destroy([
                "need password renewal or sim not registered, closing all ast",
                `sockets that have a contact registered to imsi: ${imsi}`
            ].join(" "));

        }

    }

}

namespace contacts {

    const map = new Map<types.Contact, { timer: NodeJS.Timer, asteriskSocket: sipLibrary.Socket; }>();

    export const evtExpiredContact = new SyncEvent<{
        contact: types.Contact,
        asteriskSocket: sipLibrary.Socket
    }>();

    export function _delete(contact: types.Contact): void {

        let entry = map.get(contact);

        if (entry) {

            clearTimeout(entry.timer);

        }

        map.delete(contact);

    }

    export function setOrRefresh(
        contact: types.Contact,
        asteriskSocket: sipLibrary.Socket,
        timeout: number
    ): void {

        _delete(contact);

        let timer = setTimeout(() => {

            map.delete(contact);

            evtExpiredContact.post({ contact, asteriskSocket });

        }, timeout);

        timer.unref();

        map.set(contact, { timer, asteriskSocket });

    }

    export function get() {

        let out: { contact: types.Contact; asteriskSocket: sipLibrary.Socket; }[] = [];

        for (let [contact, { asteriskSocket }] of map) {

            out.push({ contact, asteriskSocket });

        }

        return out;

    }

}

contacts.evtExpiredContact.attach(
    ({ contact, asteriskSocket }) => {

        asteriskSocket.destroy(`Contact associated to connection expired`);

        backendRemoteApiCaller.forceContactToRegister(contact);

    }
);

function onContactRegistered(
    contact: types.Contact,
    expire: number,
    asteriskSocket: sipLibrary.Socket
): void {

    asteriskSocket.evtClose.attachOnce(() => {

        contacts._delete(contact);

        dbAsterisk.deleteContact(contact);

    });

    contacts.get().find(entry => {

        if (
            entry.contact !== contact &&
            misc.areSameUaSims(contact.uaSim, entry.contact.uaSim)
        ) {

            entry.asteriskSocket.destroy("Same UA re-registered with an other connection");

            return true;

        }

        return false;

    });

    contacts.setOrRefresh(contact, asteriskSocket, expire * 1000);

    evtContactRegistration.post(contact);

}


/** should be called against every new asterisk socket */
export function handleAsteriskSocket(
    asteriskSocket: sipLibrary.Socket
): Promise<types.Contact> {

    let imsi: string;
    let connectionId: string;

    asteriskSocket.evtPacketPreWrite.attachOnce(
        sipLibrary.matchRequest,
        sipRequest => {

            imsi = misc.readImsi(sipRequest);
            connectionId = misc.cid.read(sipRequest);

        }
    );

    let purgedContactUri: string;

    asteriskSocket.evtPacketPreWrite.attachOnce(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            !!sipLibrary.getContact(sipPacket)
        ),
        sipRequest => {

            let parsedUri = sipLibrary.parseUri(
                sipLibrary.getContact(sipRequest)!.uri
            );

            parsedUri.params = {
                "mk": `${misc.cid.parse(connectionId).timestamp}`.match(/([0-9]{6})$/)![1]
            };

            purgedContactUri = sipLibrary.stringifyUri(parsedUri);

        }
    );

    let contact: types.Contact;
    let expire: number;

    asteriskSocket.evtPacketPreWrite.attachOnce(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            sipPacket.method === "REGISTER"
        ),
        sipRequestRegister => {

            let [aorParams, uriParams] = (() => {

                let contactAor = sipLibrary.getContact(sipRequestRegister)!;

                return [
                    contactAor.params,
                    sipLibrary.parseUri(contactAor.uri).params
                ];

            })();

            contact = {
                "uri": purgedContactUri,
                connectionId,
                "path": sipLibrary.stringifyPath(sipRequestRegister.headers.path!),
                "uaSim": {
                    imsi,
                    "ua": {
                        "instance": aorParams["+sip.instance"]!,
                        "userEmail": misc.urlSafeB64.dec((
                            sipLibrary.parseUri(sipRequestRegister.uri).params["enc_email"] ||
                            uriParams["enc_email"] ||
                            aorParams["enc_email"]
                        )!),
                        "platform": (() => {

                            switch (uriParams["pn-type"]) {
                                case "google":
                                case "firebase":
                                    return "android";
                                case "apple":
                                    return "iOS";
                                default:
                                    return "web";
                            }

                        })(),

                        "pushToken": uriParams["pn-tok"] || "",
                        "software": sipRequestRegister.headers["user-agent"]

                    }
                }
            };

            expire = parseInt(sipRequestRegister.headers["expires"]);

        }
    );

    let evtRegistered = new VoidSyncEvent();

    asteriskSocket.evtPacketPreWrite.attach(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            sipPacket.method === "REGISTER" &&
            sipPacket.headers["authorization"]!!
        ),
        sipRequestRegister =>
            asteriskSocket.evtResponse.attachOnce(
                sipResponse => sipLibrary.isResponse(sipRequestRegister, sipResponse),
                ({ status }) => {

                    if (status !== 200) {
                        return;
                    }

                    onContactRegistered(contact, expire, asteriskSocket);

                    if (!evtRegistered.postCount) {
                        evtRegistered.post();
                    }

                }
            )
    );

    asteriskSocket.evtPacketPreWrite.attach(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            !!sipLibrary.getContact(sipPacket)
        ),
        sipPacket => sipLibrary.getContact(sipPacket)!.uri = purgedContactUri
    );

    return new Promise(
        resolve => evtRegistered
            .waitFor(6001)
            .then(() => resolve(contact))
            .catch(() => asteriskSocket.destroy("This connection did not register a contact in time"))
    );

}



