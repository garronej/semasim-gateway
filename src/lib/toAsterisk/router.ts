

import * as sip from "ts-sip";
import * as sipRouting from "../misc/sipRouting";
import * as types from "../types";
import * as backendConnection from "../toBackend/connection";

/** Assert we have an active backend connection */
export function handle(
    socket: sip.Socket,
    connectionId: string,
    prPlatform: Promise<types.Ua.Platform>
) {

    const onSipPacket = (() => {

        const iceHacks = (() => {

            let platform: types.Ua.Platform;

            prPlatform.then(v => platform = v);

            const { uaSocket: { remoteAddress: uaAddress } } = sipRouting.cid.parse(connectionId);

            return (sipPacketNextHop: sip.Packet): void => {

                if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
                    return;
                }

                //Platform will be set then.
                switch (platform) {
                    case "android": {

                        const srvflx = sip.readSrflxAddrInSdp(
                            sip.getPacketContent(sipPacketNextHop)
                                .toString("utf8")
                        );

                        //If we stun resolution failed skip.
                        if (!srvflx) {
                            break;
                        }

                        //=> if the gateway and the UA on the same LAN skip.
                        if (uaAddress === srvflx) {
                            return;
                        }


                        //Adding a c line with the public address.

                        const parsedSdp = sip.parseSdp(
                            sip.getPacketContent(sipPacketNextHop).toString("utf8")
                        );

                        parsedSdp["m"][0]["c"] = { ...parsedSdp["c"], "address": srvflx };

                        sip.setPacketContent(
                            sipPacketNextHop,
                            sip.stringifySdp(parsedSdp)
                        );


                    }
                    default: break;
                }

            };


        })();

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

        //NOTE: when the backend disconnect the socket will be closed.
        const backendSocket = backendConnection.get() as sip.Socket;

        return (sipPacket: sip.Packet): void => {

            asteriskPatches(sipPacket);

            const sipPacketNextHop = backendSocket.buildNextHopPacket(sipPacket);

            if (sip.matchRequest(sipPacketNextHop)) {

                sipRouting.cid.set(sipPacketNextHop, connectionId);

            }

            iceHacks(sipPacketNextHop);

            backendSocket.write(sipPacketNextHop);

        };

    })();

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);

}
