import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../../tools/networkTools";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
import { readImsi, cid } from "./misc";

import * as messages from "./messages/index_sipProxy";
import * as backendSocket from "./backendSocket/index_sipProxy";
import * as asteriskSockets from "./asteriskSockets/index_sipProxy";

import * as c from "./../_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/router");

export async function launch() {

    debug("Launch");

    let localIp: string;
    let host: string;

    try {

        localIp = await networkTools.getActiveInterfaceIp();

        /** sip.semasim.com */
        host = (await networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;

    } catch (error) {

        debug(`Sip proxy start error: ${error.message}`);

        await new Promise(resolve => setTimeout(resolve, 5000));
        launch();
        return;

    }

    let backendSocketInst= new sipLibrary.Socket(
        tls.connect({
            host,
            "port": c.gatewayPort
        })
    );

    backendSocket.set(backendSocketInst);

    backendSocketInst.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        asteriskSockets.flush();

        let delay = (function getRandomArbitrary(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        })(3000, 5000);

        debug(`Delay before restarting: ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));

        launch();

    });

    backendSocketInst.evtData.attach(data =>
        console.log(`\nFrom backend:\n${data.toString("binary").yellow}\n\n`)
    );

    backendSocketInst.evtRequest.attach(async sipRequestReceived => {

        let imsi = readImsi(sipRequestReceived);
        let connectionId= cid.read(sipRequestReceived);

        let asteriskSocket = asteriskSockets.get({ connectionId, imsi });

        if( !asteriskSocket ){

            if( asteriskSocket === null ){
                return;
            }

            asteriskSocket = createAsteriskSocket(
                connectionId, backendSocketInst, localIp
            );

            asteriskSockets.set({ connectionId, imsi }, asteriskSocket);

        }


        if (!asteriskSocket.evtConnect.postCount) {
            await asteriskSocket.evtConnect.waitFor();
        }

        let sipRequest = asteriskSocket.buildNextHopPacket(sipRequestReceived);

        if (sipRequest.method === "REGISTER") {

            let { params } = sipLibrary.parseUri(sipLibrary.getContact(sipRequest)!.uri);

            sipRequest.headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                "ua_instance": sipLibrary.getContact(sipRequest)!.params["+sip.instance"]!,
                "ua_userEmail": Buffer.from(params["base64_email"]!, "base64").toString("utf8"),
                "ua_platform": (() => {

                    switch (params["pn-type"]) {
                        case "google":
                        case "firebase":
                            return "android";
                        case "apple":
                            return "iOS";
                        default:
                            return "other";
                    }

                })(),
                "ua_pushToken": params["pn-tok"] || "",
                "ua_software": sipRequest.headers["user-agent"],
                connectionId
            });

        }

        /** We add connection id to contact params so that contact is uniq across uas */
        (() => {

            let contactAoR = sipLibrary.getContact(sipRequest);

            if (contactAoR) {

                let parsedUri = sipLibrary.parseUri(contactAoR.uri);

                parsedUri.params = { "connection_id": connectionId };

                contactAoR.uri = sipLibrary.stringifyUri(parsedUri);

            }

        })();

        if (sipLibrary.isPlainMessageRequest(sipRequest, "WITH AUTH")) {

            asteriskSocket.evtResponse.attachOnce(
                sipResponse => sipLibrary.isResponse(sipRequest, sipResponse),
                async ({ status }) => {

                    if (status !== 202) {
                        return;
                    }

                    messages.onIncomingSipMessage(
                        await asteriskSockets.getSocketContact(asteriskSocket!),
                        sipRequestReceived
                    );

                }
            );

        }

        asteriskSocket.write(sipRequest);

    });

    backendSocketInst.evtResponse.attach(sipResponseReceived => {

        let imsi = readImsi(sipResponseReceived);
        let connectionId = cid.read(sipResponseReceived);

        let asteriskSocket = asteriskSockets.get({ connectionId, imsi });

        if (!asteriskSocket) {
            return;
        }

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipResponseReceived)
        );

    });

}


function createAsteriskSocket(
    connectionId: string,
    backendSocketInst: sipLibrary.Socket,
    localIp: string
): sipLibrary.Socket {

    let asteriskSocket = new sipLibrary.Socket(
        net.createConnection(5060, localIp)
    );

    asteriskSocket.evtData.attach(data =>
        console.log(`\nFrom Asterisk:\n${data.toString("binary").grey}\n\n`)
    );

    //TODO: change for webRtc
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop: sipLibrary.Packet): void => {

        if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
            return;
        }

        let sdp = sipLibrary.getPacketContent(sipPacketNextHop).toString("utf8");

        let gatewaySocketRemoteAddress = sipLibrary.readSrflxAddrInSdp(sdp);

        if (
            !gatewaySocketRemoteAddress ||
            (
                !sipLibrary.matchRequest(sipPacketNextHop) &&
                gatewaySocketRemoteAddress === cid.parse(connectionId).clientSocketRemoteAddress
            )
        ) return;

        let parsedSdp = sipLibrary.parseSdp(sdp);

        parsedSdp.m[0].c = { ...parsedSdp.c, "address": gatewaySocketRemoteAddress };

        sipLibrary.setPacketContent(
            sipPacketNextHop,
            sipLibrary.stringifySdp(parsedSdp)
        );

    };

    asteriskSocket.evtRequest.attach(sipRequestReceived => {

        if (backendSocketInst.evtClose.postCount) {
            return;
        }

        let sipRequest = backendSocketInst.buildNextHopPacket(sipRequestReceived);

        cid.set(sipRequest, connectionId);

        fixSdp(sipRequest);

        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            messages.onOutgoingSipMessage(
                sipRequest, 
                backendSocketInst.evtResponse.waitFor(
                    sipResponse => sipLibrary.isResponse(sipRequest, sipResponse),
                    5000
                )
            );

        }

        backendSocketInst.write(sipRequest);

    });

    asteriskSocket.evtResponse.attach(sipResponseReceived => {

        if (backendSocketInst.evtClose.postCount) {
            return;
        }

        let sipResponse = backendSocketInst.buildNextHopPacket(sipResponseReceived);

        fixSdp(sipResponse);

        backendSocketInst.write(sipResponse);

    });

    return asteriskSocket;

}
