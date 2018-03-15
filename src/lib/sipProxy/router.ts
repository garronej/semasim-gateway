import * as tls from "tls";
import * as net from "net";
import { SyncEvent } from "ts-events-extended";
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

export async function createBackendSocket(): Promise<sipLibrary.Socket> {

    debug("Launch");

    let localIp: string;
    let host: string;

    while (true) {

        try {

            localIp = await networkTools.getActiveInterfaceIp();

            /** sip.semasim.com */
            host = (await networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;

            break;

        } catch (error) {

            debug(`Sip proxy start error: ${error.message}`);

            await new Promise(resolve => setTimeout(resolve, 5000));

        }

    }

    let backendSocketInst = new sipLibrary.Socket(
        tls.connect({ host, "port": c.gatewayPort })
    );

    backendSocket.set(backendSocketInst);

    backendSocketInst.evtClose.attachOnce(() => asteriskSockets.flush() );

    backendSocketInst.evtData.attach(data=> console.log("BK-GW=>GW\n", `${data.toString("utf8").yellow}`));

    backendSocketInst.evtRequest.attach(async sipRequestReceived => {

        let imsi = readImsi(sipRequestReceived);
        let connectionId = cid.read(sipRequestReceived);

        let asteriskSocket = asteriskSockets.get({ connectionId, imsi });

        if (!asteriskSocket) {

            if (asteriskSocket === null) {
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

        console.log("GW=>AST\n", `${sipLibrary.stringify(sipRequest).yellow}`)

        asteriskSocket.write(sipRequest);

    });

    backendSocketInst.evtResponse.attach(sipResponseReceived => {

        let imsi = readImsi(sipResponseReceived);
        let connectionId = cid.read(sipResponseReceived);

        let asteriskSocket = asteriskSockets.get({ connectionId, imsi });

        if (!asteriskSocket) {
            return;
        }

        console.log("GW=>AST\n", `${sipLibrary.stringify(asteriskSocket.buildNextHopPacket(sipResponseReceived)).yellow}`)

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipResponseReceived)
        );

    });

    return backendSocketInst;

}


function createAsteriskSocket(
    connectionId: string,
    backendSocketInst: sipLibrary.Socket,
    localIp: string
): sipLibrary.Socket {

    let asteriskSocket = new sipLibrary.Socket(
        net.connect({
            "host": localIp,
            "port": 5060
        })
    );


    asteriskSocket.evtData.attach(data => console.log("GW<=AST\n", data.toString("utf8")));

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

        let evtMessageResponseReceived: undefined | SyncEvent<sipLibrary.Response>;

        if (sipLibrary.isPlainMessageRequest(sipRequestReceived)) {

            messages.onOutgoingSipMessage(
                sipRequestReceived,
                new Promise<sipLibrary.Response>(
                    (resolve, reject) =>
                        (evtMessageResponseReceived = new SyncEvent())
                            .waitFor(5000)
                            .then(sipResponse => resolve(sipResponse))
                            .catch(error => reject(error))
                )
            );

            console.log("After interception\n", sipLibrary.stringify(sipRequestReceived));

        }

        if (backendSocketInst.evtClose.postCount) {
            return;
        }

        let sipRequest = backendSocketInst.buildNextHopPacket(sipRequestReceived);

        cid.set(sipRequest, connectionId);

        fixSdp(sipRequest);

        if (!!evtMessageResponseReceived) {

            backendSocketInst.evtResponse.waitFor(
                sipResponse => sipLibrary.isResponse(sipRequest, sipResponse),
                evtMessageResponseReceived.getHandlers()[0].timeout!
            )
                .then(sipResponse => evtMessageResponseReceived!.post(sipResponse))
                .catch(() => { })
                ;

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
