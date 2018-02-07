import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../tools/networkTools";
import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../tools/sipLibrary";
import { Contact, PsContact } from "./sipContact";
import * as db from "./db";

import * as sipApiBackend from "./sipApiBackedClientImplementation";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy");

export const evtIncomingMessage = new SyncEvent<{
    fromContact: Contact;
    sipRequest: sipLibrary.Request;
}>();

export const evtOutgoingMessage = new SyncEvent<{
    sipRequest: sipLibrary.Request;
    prSipResponse: Promise<sipLibrary.Response>;
}>();

let backendSocket: sipLibrary.Socket;

export const evtNewBackendSocketConnect = new SyncEvent<sipLibrary.Socket>();

export function getBackendSocket(): sipLibrary.Socket | Promise<sipLibrary.Socket> {

    if (
        !backendSocket ||
        backendSocket.evtClose.postCount ||
        !backendSocket.evtConnect.postCount
    ){

        return evtNewBackendSocketConnect.waitFor();

    }else{

        return backendSocket;

    }


}

export function getContacts(
    imsi?: string
): Contact[] {

    return asteriskSockets.getContacts(imsi);

}

namespace asteriskSockets {

    const map = new Map<string, sipLibrary.Socket | null>();

    export function getContacts(
        imsi?: string
    ): Contact[] {

        let match: (contact: Contact)=> boolean;

        if( imsi ){
            match= contact=> contact.uaSim.imsi === imsi;
        }else{
            match= ()=> true;
        }

        let contacts: Contact[]= [];

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

        let prContact = db.asterisk.evtNewContact.attachOncePrepend(
            contact => (
                contact.connectionId === connectionId &&
                contact.uaSim.imsi === imsi
            ),
            6000,
            contact => {

                socket.evtClose.attachOnce(() => {
                    db.asterisk.evtExpiredContact.detach(prContact);
                    db.asterisk.deleteContact(contact);
                });

                db.asterisk.evtExpiredContact.attachOnce(
                    expiredContact => expiredContact.id === contact.id,
                    prContact,
                    () => {
                        debug("expired contact");
                        socket.destroy();
                        sipApiBackend.forceContactToRegister(contact);
                    }
                );


                for( let socket_i of map.values() ){

                    if( socket_i === null ) continue;

                    let contact_i: Contact | undefined= socket_i.misc["contact"];

                    if(! contact_i ) continue;

                    if( Contact.UaSim.areSame(contact_i.uaSim, contact.uaSim) ){

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
    ): Contact | Promise<Contact> {
        return socket.misc["contact"] || socket.misc["prContact"];
    }

    export function flush() {

        for (let socket of map.values()) {
            if (socket === null) continue;
            socket.destroy();
        }

    }

}

let localIp = "";

export async function start() {

    debug(`${localIp ? "re-" : ""}Starting`);

    try {

        localIp = await networkTools.getActiveInterfaceIp();

    } catch{

        debug("No active interface IP scheduling retry...");

        await new Promise(resolve => setTimeout(resolve, 5000));
        start();
        return;

    }

    backendSocket = new sipLibrary.Socket(
        tls.connect({
            "host": (await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`))[0].name,
            "port": c.shared.gatewayPort
        })
    );

    backendSocket.setKeepAlive(true);

    backendSocket.evtData.attach(chunk =>
        console.log(`\nFrom backend:\n${chunk.yellow}\n\n`)
    );

    backendSocket.evtConnect.attachOnce(() => 
        evtNewBackendSocketConnect.post(backendSocket)
    );

    backendSocket.evtRequest.attach(async sipRequest => {

        let { headers } = sipRequest;

        let connectionId = parseInt(headers.via[0].params["connection_id"]!);

        let imsi = sipLibrary.parseUri(headers.from.uri).user!;

        let asteriskSocket = asteriskSockets.get(connectionId, imsi);

        if (asteriskSocket === undefined) {

            let uaPublicIp= headers.via[0].params["received"]!;

            asteriskSocket = createAsteriskSocket(
                connectionId, 
                imsi, 
                uaPublicIp,
                backendSocket
            );

        } else if (asteriskSocket === null) {

            return;

        }

        if (!asteriskSocket.evtConnect.postCount) await asteriskSocket.evtConnect.waitFor();

        let contactAoR = headers.contact ? headers.contact[0] : undefined;

        if (sipRequest.method === "REGISTER") {

            let contactParams= sipLibrary.parseUri(contactAoR!.uri).params;


            headers["user-agent"] = PsContact.stringifyMisc({
                "ua_instance": contactAoR!.params["+sip.instance"]!,
                "ua_userEmail": (new Buffer(contactParams["base64_email"]!, "base64")).toString("utf8"),
                "ua_platform": (() => {

                    switch (contactParams["pn-type"]) {
                        case "google":
                        case "firebase":
                            return "android";
                        case "apple":
                            return "iOS";
                        default:
                            return "other";
                    }

                })(),
                "ua_pushToken": contactParams["pn-tok"] || "",
                "ua_software": headers["user-agent"],
                connectionId
            });

            asteriskSocket.addPathHeader(sipRequest);

        } else {

            asteriskSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);

        }

        if (contactAoR) {

            let parsedUri = sipLibrary.parseUri(contactAoR.uri);

            parsedUri.params = {};

            contactAoR.uri = sipLibrary.stringifyUri(parsedUri);

        }

        let branch = asteriskSocket.addViaHeader(sipRequest);

        //TODO match with authentication
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            //TODO: why prepend => because via header is to be modified
            asteriskSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                async sipResponse => {

                    if (sipResponse.status !== 202) return;

                    let fromContact = await asteriskSockets.getContact(asteriskSocket!);

                    evtIncomingMessage.post({ fromContact, sipRequest });

                }
            );

        }

        asteriskSocket.write(sipRequest);

    });


    backendSocket.evtResponse.attach(sipResponse => {

        let connectionId = parseInt(sipResponse.headers.via[0].params["connection_id"]!);

        let imsi = sipLibrary.parseUri(sipResponse.headers.to.uri).user!;

        let asteriskSocket = asteriskSockets.get(connectionId, imsi);

        if (!asteriskSocket) return;

        asteriskSocket.pushRecordRoute(sipResponse, false);

        sipResponse.headers.via.shift();

        asteriskSocket.write(sipResponse);

    });


    backendSocket.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        asteriskSockets.flush();

        let delay = (function getRandomArbitrary(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        })(3000, 5000);

        debug(`Delay before restarting: ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));

        start();

    });

}


function createAsteriskSocket(
    connectionId: number,
    imsi: string,
    uaPublicIp: string,
    backendSocket: sipLibrary.Socket
): sipLibrary.Socket {

    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));

    asteriskSockets.set(connectionId, imsi, asteriskSocket);

    asteriskSocket.evtData.attach(chunk =>
        console.log(`\nFrom Asterisk:\n${chunk.grey}\n\n`)
    );

    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    (()=>{

        let matcher = (sipPacket: sipLibrary.Packet) => 
            sipPacket.headers["content-type"] === "application/sdp";

        let handler = (sipPacket: sipLibrary.Packet): void => {

            let sdp = sipPacket.content;

            let gatewayPublicIp = sipLibrary.readSrflxAddrInSdp(sdp);

            if (
                !gatewayPublicIp ||
                (
                    !sipLibrary.matchRequest(sipPacket) &&
                    gatewayPublicIp === uaPublicIp
                )
            ) return;

            let parsedSdp = sipLibrary.parseSdp(sdp);

            parsedSdp.m[0].c = { ...parsedSdp.c, "address": gatewayPublicIp };

            sipPacket.content = sipLibrary.stringifySdp(parsedSdp);

        };

        asteriskSocket.evtRequest.attachPrepend(matcher, handler);
        asteriskSocket.evtResponse.attachPrepend(matcher, handler);


    })();

    asteriskSocket.evtRequest.attach(sipRequest => {

        if (backendSocket.evtClose.postCount) return;

        let branch = backendSocket.addViaHeader(sipRequest, { "connection_id": `${connectionId}` });

        backendSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);

        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            //NOTE: we do not use waitFor because header via is modified when the response is handled
            let prSipResponse = backendSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                5000,
                () => { }
            );

            evtOutgoingMessage.post({ sipRequest, prSipResponse });

        }

        backendSocket.write(sipRequest);

    });

    asteriskSocket.evtResponse.attach(sipResponse => {

        if (backendSocket.evtClose.postCount) return;

        backendSocket.pushRecordRoute(sipResponse, true);

        sipResponse.headers.via.shift();

        backendSocket.write(sipResponse);

    });

    return asteriskSocket;
}
