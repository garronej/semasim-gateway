import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../../tools/networkTools";
import * as sipLibrary from "ts-sip";
import { readImsi, cid } from "./misc";
import * as backendSocket from "./backendSocket/index_sipProxy";
import * as asteriskSockets from "./asteriskSockets";
import * as contactRegistrationMonitor from "./contactsRegistrationMonitor";
import * as messages from "./messages";


import * as c from "./../_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/router");

export async function createBackendSocket(): Promise<sipLibrary.Socket> {

    let localIp: string;
    let host: string;

    while (true) {

        try {

            localIp = await networkTools.getActiveInterfaceIp();

            /** SRV _sips._tcp.semasim.com => [{ name: sip.semasim.com }] */
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

    backendSocketInst.enableLogger({
        "socketId": "backendSocket",
        "remoteEndId": "BACKEND-GW-SIDE",
        "localEndId": "GW",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": true,
        "outgoingTraffic": true,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    });

    backendSocket.set(backendSocketInst);

    backendSocketInst.evtClose.attachOnce(() => asteriskSockets.flush() );

    backendSocketInst.evtRequest.attach(async sipRequestReceived => {

        let key: asteriskSockets.Key= {
            "imsi": readImsi(sipRequestReceived),
            "connectionId": cid.read(sipRequestReceived)
        };

        let asteriskSocket = asteriskSockets.get(key);

        if (!asteriskSocket) {

            if (asteriskSocket === null) {

                debug("connectionId expired, discarding".red);

                return;
            }

            asteriskSocket = createAsteriskSocket(
                key.connectionId, backendSocketInst, localIp
            );

            asteriskSockets.set(key, asteriskSocket);

            let prContact= contactRegistrationMonitor.onNewAsteriskSocket(asteriskSocket);

            messages.onNewAsteriskSocket(asteriskSocket, prContact);

        }

        if (!asteriskSocket.evtConnect.postCount) {
            await asteriskSocket.evtConnect.waitFor();
        }

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipRequestReceived)
        );

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

    asteriskSocket.enableLogger({
        "socketId": "asteriskSocket",
        "remoteEndId": "ASTERISK",
        "localEndId": "GW",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT"
    });

    const clientSocketRemoteAddress= cid.parse(connectionId).clientSocketRemoteAddress;

    //TODO: si if for webRtc it is desirable
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop: sipLibrary.Packet): void => {

        let sdp = sipLibrary.getPacketContent(sipPacketNextHop).toString("utf8");

        let gatewaySocketRemoteAddress = sipLibrary.readSrflxAddrInSdp(sdp);

        if (
            !gatewaySocketRemoteAddress ||
            (
                !sipLibrary.matchRequest(sipPacketNextHop) &&
                gatewaySocketRemoteAddress === clientSocketRemoteAddress
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
