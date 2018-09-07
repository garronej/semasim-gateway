

import * as sip from "ts-sip";
import * as misc from "../misc";
import * as backendConnection from "../toBackend/connection";

/** Assert we have an active backend connection */
export function handle(socket: sip.Socket, connectionId: string) {

    //NOTE: when the backend disconnect the socket will be closed.
    const backendSocket = backendConnection.get() as sip.Socket;

    const { uaSocket: { remoteAddress: uaAddress } }= misc.cid.parse(connectionId);

    //TODO: see if for webRtc it is desirable
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop: sip.Packet): void => {

        const sdp = sip.getPacketContent(sipPacketNextHop).toString("utf8");

        const publicAddress = sip.readSrflxAddrInSdp(sdp);

        if (
            !publicAddress ||
            (
                !sip.matchRequest(sipPacketNextHop) &&
                publicAddress === uaAddress
            )
        ) return;

        const parsedSdp = sip.parseSdp(sdp);

        parsedSdp.m[0].c = { ...parsedSdp.c, "address": publicAddress };

        sip.setPacketContent(
            sipPacketNextHop,
            sip.stringifySdp(parsedSdp)
        );

    };

    const onSipPacket= (sipPacket: sip.Packet): void => {

        const sipPacketNextHop = backendSocket.buildNextHopPacket(sipPacket);

        if( sip.matchRequest(sipPacketNextHop) ){

            misc.cid.set(sipPacketNextHop, connectionId);

        }

        if (sipPacketNextHop.headers["content-type"] === "application/sdp") {

            fixSdp(sipPacketNextHop);

        }

        backendSocket.write(sipPacketNextHop);

    };

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);


}
