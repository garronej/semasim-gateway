import * as sipLibrary from "ts-sip";
import * as types from "./types";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as sipRouting from "./misc/sipRouting";
import { areSameUaSims } from "./misc/misc"
import * as dbAsterisk from "./dbAsterisk";
import * as serializedUaObjectCarriedOverSipContactParameter from "./misc/serializedUaObjectCarriedOverSipContactParameter";
import * as crypto from "crypto";
import * as logger from "logger";

const debug = logger.debugFactory();

//TODO: create proxy
export const evtContactRegistration = new SyncEvent<types.Contact>();

export function getContacts(imsi?: string): types.Contact[] {
    return contacts.get()
        .filter(({ contact }) => !!imsi ? (contact.uaSim.imsi === imsi) : true)
        .map(({ contact }) => contact);
}

/** Close all asteriskSocket that has a contact registered to a IMSI */
export function discardContactsRegisteredToSim(imsi: string, asteriskSocketsDestroyReason: string): void {



    for (let { contact, asteriskSocket } of contacts.get()) {

        if (contact.uaSim.imsi === imsi) {

            asteriskSocket.destroy(asteriskSocketsDestroyReason);

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
    ({ contact, asteriskSocket }) => asteriskSocket.destroy(
        `Contact ${contact.uri} that was associated associated to this connection has expired`
    )
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

    let sipContactRegistrationType:
        "NEW REGISTRATION" |
        "REGISTRATION REFRESH" |
        "UNREGISTER" |
        "NEW REGISTRATION OF AN UA(SIM) THAT HAD A REGISTRATION STILL VALID ON AN OTHER CONNECTION"
        = "NEW REGISTRATION";

    for (const { contact: contact_i, asteriskSocket: asteriskSocket_i } of contacts.get()) {

        if (contact_i === contact) {

            sipContactRegistrationType = expire === 0 ? "UNREGISTER" : "REGISTRATION REFRESH";

            break;
        }

        if (areSameUaSims(contact.uaSim, contact_i.uaSim)) {

            asteriskSocket_i.destroy("UA re-registered with an other connection");

            sipContactRegistrationType =
                "NEW REGISTRATION OF AN UA(SIM) THAT HAD A REGISTRATION STILL VALID ON AN OTHER CONNECTION";

            break;

        }

    }

    debug(
        JSON.stringify({
            sipContactRegistrationType,
            expire,
            contact
        }, null, 2)
    );


    contacts.setOrRefresh(contact, asteriskSocket, expire * 1000);

    if (expire === 0) {
        return;
    }

    evtContactRegistration.post(contact);

}

/** should be called against every new asterisk socket */
export function handleAsteriskSocket( asteriskSocket: sipLibrary.Socket): Promise<types.Contact> {

    let imsi: string;
    let connectionId: string;

    asteriskSocket.evtPacketPreWrite.attachOnce(
        sipLibrary.matchRequest,
        sipRequest => {

            imsi = sipRouting.readImsi(sipRequest);
            connectionId = sipRouting.cid.read(sipRequest);

        }
    );

    /*NOTE: Asterisk use a fixed length buffer for storing contact uri 
    as a result we have to first extract the information carried by the 
    contact then remove the parameters so it does not overflow asterisk 
    buffer. We still need the contact uri to be uniq so we add a mark. */
    let purgedContactUri: string;

    asteriskSocket.evtPacketPreWrite.attachOnce(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            !!sipLibrary.getContact(sipPacket)
        ),
        sipRequest => {

            const { uri } = sipLibrary.getContact(sipRequest)!;

            const parsedUri = sipLibrary.parseUri(uri);

            /*NOTE: Each asteriskSocket have an single sip contact registration
            associated to it. and an asterisk socket is identified by a connectionId and an imsi
            so the contact uri must be unique across imsi + connectionId
            */
            parsedUri.params = {
                "mk": crypto.createHash("md5")
                    .update(uri + connectionId)
                    .digest("hex")
                    .substring(0, 8)
            };

            purgedContactUri = sipLibrary.stringifyUri(parsedUri);

        }
    );

    let contact: types.Contact;

    //TODO: What if an old client connect, or an attacked provide malformed params ?
    asteriskSocket.evtPacketPreWrite.attachOnce(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            sipPacket.method === "REGISTER"
        ),
        sipRequestRegister => contact = {
            "uri": purgedContactUri,
            connectionId,
            "path": sipLibrary.stringifyPath(sipRequestRegister.headers.path!),
            "uaSim": {
                imsi,
                "ua": serializedUaObjectCarriedOverSipContactParameter.parseFromContactUriParams(
                    sipLibrary.parseUri(
                        sipLibrary.getContact(sipRequestRegister)!.uri
                    ).params
                )

            }
        }
    );

    const evtFirstRegistration = new VoidSyncEvent();

    asteriskSocket.evtPacketPreWrite.attach(
        (sipPacket): sipPacket is sipLibrary.Request => (
            sipLibrary.matchRequest(sipPacket) &&
            sipPacket.method === "REGISTER" &&
            sipPacket.headers["authorization"]!!
        ),
        sipRequestRegister =>
            asteriskSocket.evtResponse.attachOnce(
                sipResponse => sipLibrary.isResponse(sipRequestRegister, sipResponse),
                sipResponse => {

                    if (sipResponse.status !== 200) {
                        return;
                    }

                    onContactRegistered(
                        contact,
                        parseInt(sipResponse.headers["expires"]),
                        asteriskSocket
                    );

                    if (evtFirstRegistration.postCount) {
                        return;
                    }

                    evtFirstRegistration.post();

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
        resolve => evtFirstRegistration
            .waitFor(6001)
            .then(() => resolve(contact))
            .catch(() => asteriskSocket.destroy("This connection did not register a contact in time"))
    );

}



