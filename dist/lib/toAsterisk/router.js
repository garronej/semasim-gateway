"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const misc = require("../misc");
const backendConnection = require("../toBackend/connection");
/** Assert we have an active backend connection */
function handle(socket, connectionId, prPlatform) {
    let platform;
    prPlatform.then(v => platform = v);
    //NOTE: when the backend disconnect the socket will be closed.
    const backendSocket = backendConnection.get();
    const { uaSocket: { remoteAddress: uaAddress } } = misc.cid.parse(connectionId);
    const iceHacks = (sipPacketNextHop) => {
        if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
            return;
        }
        //Platform will be set then.
        switch (platform) {
            case "android": {
                const srvflx = sip.readSrflxAddrInSdp(sip.getPacketContent(sipPacketNextHop)
                    .toString("utf8"));
                //If we stun resolution failed skip.
                if (!srvflx) {
                    break;
                }
                if (uaAddress !== srvflx) {
                    //=> The gateway and the UA are NOT on the same LAN.
                    //Adding a c line with the public address.
                    const parsedSdp = sip.parseSdp(sip.getPacketContent(sipPacketNextHop).toString("utf8"));
                    parsedSdp["m"][0]["c"] = Object.assign({}, parsedSdp["c"], { "address": srvflx });
                    sip.setPacketContent(sipPacketNextHop, sip.stringifySdp(parsedSdp));
                }
            }
            default:
                break;
                ;
        }
    };
    const asteriskPatches = (sipPacket) => {
        /*
        Patch for a bug in Asterisk:
        For some request ( CANCEL, BYE ... ) routes are included
        two times. This remove the duplicates.
        */
        if (sip.matchRequest(sipPacket) && !!sipPacket.headers.route) {
            sipPacket.headers.route = Array.from((new Map(sipPacket.headers.route.map((route) => [sip.stringifyPath([route]), route]))).values());
        }
    };
    const onSipPacket = (sipPacket) => {
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
exports.handle = handle;
