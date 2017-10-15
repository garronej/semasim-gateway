import * as tls from "tls";
import * as net from "net";
import * as network from "network";
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


const informativeHostname = "semasim-gateway.invalid";

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

const asteriskSockets = new Map<string, sipLibrary.Socket | null>();

asteriskSockets.set = function set(flowToken, socket: sipLibrary.Socket) {

    let self: typeof asteriskSockets = this;

    socket.evtClose.attachOnce(() =>
        Map.prototype.set.call(self, flowToken, null)
    );

    return Map.prototype.set.call(self, flowToken, socket);

}

const mapAstSockContact = new TrackableMap<sipLibrary.Socket, Contact>();

//Parfois on a old contact et contact en même temps dans la db
//si on wakeUp un contact qui a ete overwrite ou est entrain de l'être
//alors le backend vas faire un qualify qui vas fail et enchainer avec une push
//ce qui vas forcer le ré enregistrement.
//Normalement quand on fait getContacts on a jamais un doublon pk delete contact est appeler avant
//syncronement avent que des trigers soit declancher pour le nvx contact.

mapAstSockContact.set = function set(socket, contact) {

    debug(`associate contact to asteriskSocket: ${contact.flowToken}`);

    let self: typeof mapAstSockContact = this;

    let boundTo= [];

    socket.evtClose.attachOnce(() => {
        debug(`closed asteriskSocket: ${contact.flowToken}`);
        db.asterisk.getEvtExpiredContact().detach(boundTo),
        self.delete(socket);
        db.asterisk.deleteContact(contact);
    });

    db.asterisk.getEvtExpiredContact().attachOnce(
        expiredContact => expiredContact.ps.id === contact.ps.id,
        boundTo,
        () => {
            debug(`expired contact ${contact.flowToken}`);
            socket.destroy();
            sipApiBackend.sendPushNotification.makeCall(contact.uaEndpoint.ua);
        }
    );

    let oldContact = self.find(
        oldContact => Contact.UaEndpoint.areSame(
            oldContact.uaEndpoint,
            contact.uaEndpoint
        )
    );

    if (oldContact) {
        debug(`uaInstance re-registered, with new contact, overwritten contact: ${oldContact.pretty}`);
        let oldSocket = self.keyOf(oldContact)!;
        oldSocket.destroy();
    }

    return TrackableMap.prototype.set.call(self, socket, contact);

};

let localIp = "";

export async function start() {

    debug("(re)Staring !");

    if (!localIp) {
        localIp = await new Promise<string>(
            (resolve, reject) => network.get_private_ip(
                (err, ip) => err ? reject(err) : resolve(ip)
            )
        );
    }

    backendSocket = new sipLibrary.Socket(
        tls.connect({
            "host": (await c.shared.dnsSrv_sips_tcp).name,
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

    backendSocket.evtConnect.attachOnce(async () => {

        debug("Connection established with backend");

        evtNewBackendSocketConnect.post();

        let handledUa = new Set<string>();

        for (let [imei] of await db.semasim.getDonglesLastConnection()) {

            sipApiBackend.claimDongle.makeCall(imei).then(
                async isGranted => {

                    if (!isGranted) return;

                    let uas= await db.semasim.getUas(imei);

                    for( let ua of uas ){

                        if( handledUa.has(ua.instance) ) continue;

                        sipApiBackend.sendPushNotification.makeCall(ua);

                        handledUa.add(ua.instance);

                    }

                }
            );

        }

    });

    backendSocket.evtRequest.attach(async sipRequest => {

        let flowToken = sipRequest.headers.via[0].params[c.shared.flowTokenKey]!;

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (asteriskSocket === undefined) {

            asteriskSocket = createAsteriskSocket(flowToken, backendSocket);

        } else if (asteriskSocket === null) {

            return;

        }

        debug(`(backend) ${sipRequest.method} ${flowToken.split("-")[1]}`.yellow);

        if (!asteriskSocket.evtConnect.postCount) await asteriskSocket.evtConnect.waitFor();

        if (sipRequest.method === "REGISTER") {

            sipRequest.headers["user-agent"] = PsContact.buildUserAgentFieldValue(
                sipRequest.headers.contact![0].params["+sip.instance"]!,
                sipRequest.headers["user-agent"]!
            );

            asteriskSocket.addPathHeader(sipRequest);

        } else {

            asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);

        }


        let branch = asteriskSocket.addViaHeader(sipRequest);

        //TODO match with authentication
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            asteriskSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                async sipResponse => {

                    if (sipResponse.status !== 202) return;

                    let fromContact = mapAstSockContact.get(asteriskSocket!);

                    if (!fromContact) {

                        //TODO: test, should not cause memory leak
                        fromContact = (await mapAstSockContact.evtSet.waitFor(
                            ([_, socket]) => socket === asteriskSocket
                        ))[0];

                    }

                    evtIncomingMessage.post({ fromContact, sipRequest });

                }
            );

        }

        asteriskSocket.write(sipRequest);

    });


    backendSocket.evtResponse.attach(sipResponse => {

        let flowToken = sipResponse.headers.via[0].params[c.shared.flowTokenKey]!;

        debug(`(backend): ${sipResponse.status} ${sipResponse.reason}`.yellow);

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket) return;

        asteriskSocket.rewriteRecordRoute(sipResponse);

        sipResponse.headers.via.shift();

        asteriskSocket.write(sipResponse);

    });


    backendSocket.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        for (let asteriskSocket of asteriskSockets.values()) {
            if (!asteriskSocket) continue;
            asteriskSocket.destroy();
        }

        let delay = (function getRandomArbitrary(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        })(15000, 120000);

        debug(`Delay before restarting: ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));

        start();

    });

}






function createAsteriskSocket(
    flowToken: string,
    backendSocket: sipLibrary.Socket
): sipLibrary.Socket {

    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));

    debug(`New asterisk socket flowToken ${flowToken}`)

    asteriskSockets.set(flowToken, asteriskSocket);

    db.asterisk.getEvtNewContact().attachOncePrepend(
        contact => contact.flowToken === flowToken,
        6000,
        contact => mapAstSockContact.set(asteriskSocket, contact)
    ).catch(() => asteriskSocket.destroy());

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

        debug(`(asterisk ${flowToken}) ${sipRequest.method}`.cyan);

        let extraParamsFlowToken: Record<string, string> = {};
        extraParamsFlowToken[c.shared.flowTokenKey] = flowToken;

        let branch = backendSocket.addViaHeader(sipRequest, extraParamsFlowToken);

        backendSocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);

        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            let prSipResponse= backendSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                5000, 
                ()=>{}
            );

            evtOutgoingMessage.post({ sipRequest, prSipResponse });

        }

        backendSocket.write(sipRequest);

    });

    asteriskSocket.evtResponse.attach(sipResponse => {

        if (backendSocket.evtClose.postCount) return;

        debug(`(asterisk ${flowToken}): ${sipResponse.status} ${sipResponse.reason}`.cyan);

        backendSocket.rewriteRecordRoute(sipResponse, informativeHostname);

        sipResponse.headers.via.shift();

        backendSocket.write(sipResponse);

    });

    return asteriskSocket;
}
