import * as tls from "tls";
import * as net from "net";
//import { SyncEvent } from "ts-events-extended";
import * as networkTools from "../../tools/networkTools";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
import { readImsi, cid } from "./misc";

//import * as messages from "./messages/index_sipProxy";
import * as backendSocket from "./backendSocket/index_sipProxy";
import * as asteriskSockets from "./asteriskSockets";
import * as contactRegistrationMonitor from "./contactsRegistrationMonitor";
import * as messages from "./messages";


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

            let key: asteriskSockets.Key= { connectionId, imsi };

            asteriskSockets.set(key, asteriskSocket);

            let prContact= contactRegistrationMonitor.onNewAsteriskSocket(asteriskSocket, key);

            messages.onNewAsteriskSocket(asteriskSocket, prContact );

        }


        if (!asteriskSocket.evtConnect.postCount) {
            await asteriskSocket.evtConnect.waitFor();
        }

        let sipRequest = asteriskSocket.buildNextHopPacket(sipRequestReceived);

        if (sipRequest.method === "REGISTER") {

            let { params } = sipLibrary.parseUri(sipLibrary.getContact(sipRequest)!.uri);

            let paramsAoR= sipLibrary.getContact(sipRequest)!.params;

            //TODO: Very important base64 is not safe for email as may contain =
            sipRequest.headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                "ua_instance": paramsAoR["+sip.instance"]!,
                "ua_userEmail": (()=> {

                    try{

                    return Buffer.from((params["base64_email"] || paramsAoR["base64_email"])!, "base64").toString("utf8");

                    }catch{

                        //TODO: fix ios does not add email
                        console.log("et bim :(");

                        return "joseph.garrone.gj@gmail.com";

                    }

                })(),
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

        /** 
         * NOTE: Internally Asterisk use a small buffer of 64 bytes for contact uri variable
         * In consequence we need to shorten the length of the contact uri by removing 
         * all the parameters ( app-ip, pn-tok ect ).
         * Yet to ensure that the uri remain uniq we add a dummy timestamp param
         */
        (() => { 

            let contactAoR = sipLibrary.getContact(sipRequest);

            if (contactAoR) {

                let parsedUri = sipLibrary.parseUri(contactAoR.uri);

                parsedUri.params = { "stamp": `${cid.parse(connectionId).timestamp}` };

                contactAoR.uri = sipLibrary.stringifyUri(parsedUri);

            }

        })();

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

    //TODO: si if for webRtc it is desirable
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop: sipLibrary.Packet): void => {

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

    const onSipPacket= (sipPacketAsReceived: sipLibrary.Packet): void => {

        if (backendSocketInst.evtClose.postCount) {
            return;
        }

        let sipPacket = backendSocketInst.buildNextHopPacket(sipPacketAsReceived);

        if( sipLibrary.matchRequest(sipPacket) ){

            cid.set(sipPacket, connectionId);

        }

        if (sipPacket.headers["content-type"] === "application/sdp") {

            fixSdp(sipPacket);

        }

        backendSocketInst.write(sipPacket);

    };

    asteriskSocket.evtRequest.attach(onSipPacket);
    asteriskSocket.evtResponse.attach(onSipPacket);

    return asteriskSocket;

}
