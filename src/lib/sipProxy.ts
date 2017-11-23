import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../tools/networkTools";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as sipLibrary from "../tools/sipLibrary";
import * as sipApiBackend from "./sipApiClientBackend";
import { startListening as apiStartListening } from "./sipApi";
import { Contact, PsContact } from "./sipContact";
import * as db from "./db";

import { TrackableMap } from "trackable-map";

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

const evtNewBackendSocketConnect = new VoidSyncEvent();

export async function getBackendSocket(): Promise<sipLibrary.Socket> {

    if (
        !backendSocket ||
        backendSocket.evtClose.postCount ||
        !backendSocket.evtConnect.postCount
    ) await evtNewBackendSocketConnect.waitFor();

    return backendSocket;

}

namespace asteriskSockets {

    const map = new Map<string, sipLibrary.Socket | null>();

    const mapAstSockContact = new TrackableMap<sipLibrary.Socket, Contact>();

    export function set(
        connectionId: number,
        imei: string,
        socket: sipLibrary.Socket
    ) {

        let key = `${connectionId}${imei}`;

        socket.evtClose.attachOnce(() => map.set(key, null));

        map.set(key, socket);

        db.asterisk.getEvtNewContact().attachOncePrepend(
            contact => (
                contact.connectionId === connectionId &&
                contact.uaEndpoint.endpoint.dongle.imei === imei
            ),
            6000,
            contact => mapAstSockContact.set(socket, contact)
        ).catch(() => socket.destroy());

    }

    export function get(
        connectionId: number,
        imei: string
    ): sipLibrary.Socket | null | undefined {
        return map.get(`${connectionId}${imei}`);
    }

    export async function getContact(
        socket: sipLibrary.Socket
    ): Promise<Contact> {

        let contact = mapAstSockContact.get(socket);

        if( contact ){

            return contact;

        }else{

            let boundTo= [];

            socket.evtClose.attachOnce(boundTo, ()=>
                mapAstSockContact.evtSet.detach(boundTo)
            );

            let [ contact ] =await mapAstSockContact.evtSet.attachOnce(
                ([_, s]) => s === socket,
                boundTo, ()=>{}
            );

            socket.evtClose.detach(boundTo);

            return contact;

        }

    }

    export function flush() {

        for (let socket of map.values()) {
            if (!socket) continue;
            socket.destroy();
        }

    }

    //Parfois on a old contact et contact en même temps dans la db
    //si on wakeUp un contact qui a ete overwrite ou est entrain de l'être
    //alors le backend vas faire un qualify qui vas fail et enchainer avec une push
    //ce qui vas forcer le ré enregistrement.
    //Normalement quand on fait getContacts on a jamais un doublon pk delete contact est appeler avant
    //syncronement avent que des trigers soit declancher pour le nvx contact.

    mapAstSockContact.set = function set(socket, contact) {

        let self: typeof mapAstSockContact = this;

        let boundTo = [];

        socket.evtClose.attachOnce(() => {
            db.asterisk.getEvtExpiredContact().detach(boundTo);
            self.delete(socket);
            db.asterisk.deleteContact(contact);
        });

        db.asterisk.getEvtExpiredContact().attachOnce(
            expiredContact => expiredContact.id === contact.id,
            boundTo,
            () => {
                debug("expired contact");
                socket.destroy();
                sipApiBackend.forceContactToReRegister.makeCall(contact);
            }
        );

        let oldContact = self.find(
            oldContact => Contact.UaEndpoint.areSame(
                oldContact.uaEndpoint,
                contact.uaEndpoint
            )
        );

        if (oldContact) {
            debug("ua re-register with an other connection");
            let oldSocket = self.keyOf(oldContact)!;
            oldSocket.destroy();
        }

        return TrackableMap.prototype.set.call(self, socket, contact);

    };


}


let localIp = "";

export async function start() {

    debug(`${localIp?"re-":""}Starting`);

    try{

        localIp = await networkTools.getActiveInterfaceIp();

    }catch{
        
        debug("No active interface IP sheduling retry...");

        await new Promise(resolve=> setTimeout(resolve,5000));
        start();
        return;

    }

    backendSocket = new sipLibrary.Socket(
        tls.connect({
            "host": (await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`))[0].name,
            "port": c.shared.gatewayPort
        }) as any
    );

    //TODO: see if it really does it's job
    backendSocket.setKeepAlive(true);

    apiStartListening(backendSocket);

    /*
    backendSocket.evtPacket.attach(sipPacket =>
        console.log("From backend:\n", sipLibrary.stringify(sipPacket).yellow, "\n\n")
    );
    backendSocket.evtData.attach(chunk =>
        console.log("From backend raw:\n", chunk.yellow, "\n\n")
    );
    */

    /*
    backendSocket.evtPacket.attachPrepend(
        ({ headers }) => headers["content-type"] === "application/sdp",
        sipPacket => {

            let sdp = sipLibrary.parseSdp(sipPacket.content);

            let arr = sdp.m[0].a;

            for (let line of [...arr]) {

                if (line.match(/^candidate/) && !line.match(/relay/)) {
                    arr.splice(arr.indexOf(line), 1);
                }

            }

            console.log(arr);

            sipPacket.content = sipLibrary.stringifySdp(sdp);

        }
    );
    */

    backendSocket.evtConnect.attachOnce(async () => {

        debug("Connection established with backend");

        evtNewBackendSocketConnect.post();

        let handledUa = new Set<string>();

        for (let [imei] of await db.semasim.getDonglesLastConnection()) {

            sipApiBackend.claimDongle.makeCall(imei).then(
                async isGranted => {

                    if (!isGranted) return;

                    let uas = await db.semasim.getUas(imei);

                    for (let ua of uas) {

                        if (handledUa.has(ua.instance)) continue;

                        sipApiBackend.sendPushNotification.makeCall(ua);

                        handledUa.add(ua.instance);

                    }

                }
            );

        }

    });

    backendSocket.evtRequest.attach(async sipRequest => {

        let { headers }= sipRequest;

        let connectionId = parseInt(headers.via[0].params["connection_id"]!);

        let imei = sipLibrary.parseUri(headers.from.uri).user!;

        let asteriskSocket = asteriskSockets.get(connectionId, imei);

        if (asteriskSocket === undefined) {

            asteriskSocket = createAsteriskSocket(connectionId, imei, backendSocket);

        } else if (asteriskSocket === null) {

            return;

        }

        if (!asteriskSocket.evtConnect.postCount) await asteriskSocket.evtConnect.waitFor();

        let contactAoR= headers.contact?headers.contact[0]:undefined;

        if (sipRequest.method === "REGISTER") {

            headers["user-agent"] = PsContact.stringifyMisc({
                "ua_instance": contactAoR!.params["+sip.instance"]!,
                "ua_software": headers["user-agent"],
                connectionId,
                "pushToken": (() => {

                    let { params } = sipLibrary.parseUri(contactAoR!.uri);

                    let type = params["pn-type"];
                    let token = params["pn-tok"];

                    return (type && token)?{ type, token }:undefined;

                })()
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

        let imei = sipLibrary.parseUri(sipResponse.headers.to.uri).user!;

        let asteriskSocket = asteriskSockets.get(connectionId, imei);

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
    imei: string,
    backendSocket: sipLibrary.Socket
): sipLibrary.Socket {

    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));

    asteriskSockets.set(connectionId, imei, asteriskSocket);

    /*
    asteriskSocket.evtPacket.attach(sipPacket =>
        console.log("From Asterisk:\n", sipLibrary.stringify(sipPacket).grey, "\n\n")
    );
    asteriskSocket.evtData.attach(chunk =>
        console.log("From Asterisk raw:\n", chunk.grey, "\n\n")
    );
    */

    asteriskSocket.evtPacket.attachPrepend(
        ({ headers }) => headers["content-type"] === "application/sdp",
        sipPacket => {

            let sdp = sipLibrary.parseSdp(sipPacket.content);

            sipLibrary.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);

            sipPacket.content = sipLibrary.stringifySdp(sdp);

        }
    );


    asteriskSocket.evtRequest.attach(sipRequest => {

        if (backendSocket.evtClose.postCount) return;

        let branch = backendSocket.addViaHeader(sipRequest, { "connection_id": `${connectionId}` });

        backendSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);

        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

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
