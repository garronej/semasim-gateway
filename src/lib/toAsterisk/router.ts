

import * as sip from "ts-sip";
import * as misc from "../misc";
import * as types from "../types";
import * as backendConnection from "../toBackend/connection";

/** Assert we have an active backend connection */
export function handle(
    socket: sip.Socket,
    connectionId: string,
    prPlatform: Promise<types.Ua.Platform>
) {

    let platform: types.Ua.Platform;

    prPlatform.then(v => platform = v );

    //NOTE: when the backend disconnect the socket will be closed.
    const backendSocket = backendConnection.get() as sip.Socket;

    const { uaSocket: { remoteAddress: uaAddress } } = misc.cid.parse(connectionId);

    const iceHacks = (sipPacketNextHop: sip.Packet): void => {

        if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
            return;
        }

        const parsedSdp = sip.parseSdp(
            sip.getPacketContent(sipPacketNextHop).toString("utf8")
        );

        //Hack for Mozilla.
        parsedSdp["m"][0]["a"] = [...parsedSdp["m"][0]["a"], "mid:0"];

        //Platform will be set then.
        switch (platform) {
            case "android":

                const srvflx = sip.readSrflxAddrInSdp(
                    sip.getPacketContent(sipPacketNextHop)
                        .toString("utf8")
                );

                if (!srvflx) {
                    //stun resolution failed skip.
                    break;
                }

                if (uaAddress !== srvflx) {
                    //The gateway and the UA are NOT on the same LAN.

                    //Adding a c line with the public address.
                    parsedSdp["m"][0]["c"] = { ...parsedSdp["c"], "address": srvflx };

                }

                break;
            default: break;;
        }

        sip.setPacketContent(
            sipPacketNextHop,
            sip.stringifySdp(parsedSdp)
        );

    };

    const asteriskPatches = (sipPacket: sip.Packet) => {

        /*
        Patch for a bug in Asterisk:
        For some request ( CANCEL, BYE ... ) routes are included
        two times. This remove the duplicates.
        */
        if (sip.matchRequest(sipPacket) && !!sipPacket.headers.route) {

            sipPacket.headers.route = Array.from(
                (new Map(
                    sipPacket.headers.route.map(
                        (route): [string, sip.AoRWithParsedUri] => [sip.stringifyPath([route]), route]
                    )
                )).values()
            );

        }

    };

    const onSipPacket = (sipPacket: sip.Packet): void => {

        asteriskPatches(sipPacket);

        const sipPacketNextHop = backendSocket.buildNextHopPacket(sipPacket);

        if (sip.matchRequest(sipPacketNextHop)) {

            misc.cid.set(sipPacketNextHop, connectionId);

        }

        iceHacks(sipPacketNextHop);

        backendSocket.write(sipPacketNextHop);

    };

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);


}
