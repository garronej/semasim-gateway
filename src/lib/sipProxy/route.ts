import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../../tools/networkTools";
import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
import { asteriskSockets } from "./asteriskSockets";

import * as c from "./../_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/route");

let backendSocket: sipLibrary.Socket;

export const evtNewBackendSocketConnect = new SyncEvent<sipLibrary.Socket>();

export const evtIncomingMessage = new SyncEvent<{
    fromContact: types.Contact;
    sipRequest: sipLibrary.Request;
}>();

export const evtOutgoingMessage = new SyncEvent<{
    sipRequest: sipLibrary.Request;
    prSipResponse: Promise<sipLibrary.Response>;
}>();

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


let localIp = "";

export async function start() {

    debug(`${localIp ? "re-" : ""}Starting`);

    let host: string;

    try {

        localIp = await networkTools.getActiveInterfaceIp();

        host = (await networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;

    } catch (error) {

        debug(`Sip proxy start error: ${error.message}`);

        await new Promise(resolve => setTimeout(resolve, 5000));
        start();
        return;

    }

    backendSocket = new sipLibrary.Socket(
        tls.connect({
            host,
            "port": c.gatewayPort
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

            let uaPublicIp = headers.via[0].params["received"]!;

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

            let contactParams = sipLibrary.parseUri(contactAoR!.uri).params;

            headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                "ua_instance": contactAoR!.params["+sip.instance"]!,
                "ua_userEmail": Buffer.from(contactParams["base64_email"]!, "base64").toString("utf8"),
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
    (() => {

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
