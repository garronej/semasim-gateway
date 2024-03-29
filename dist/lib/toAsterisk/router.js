"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
var sip = require("ts-sip");
var sipRouting = require("../misc/sipRouting");
var backendConnection = require("../toBackend/connection");
/** Assert we have an active backend connection */
function handle(socket, connectionId, prPlatform) {
    var onSipPacket = (function () {
        var iceHacks = (function () {
            var platform;
            prPlatform.then(function (v) { return platform = v; });
            var uaAddress = sipRouting.cid.parse(connectionId).uaSocket.remoteAddress;
            return function (sipPacketNextHop) {
                if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
                    return;
                }
                //Platform will be set then.
                switch (platform) {
                    case "android": {
                        var srvflx = sip.readSrflxAddrInSdp(sip.getPacketContent(sipPacketNextHop)
                            .toString("utf8"));
                        //If we stun resolution failed skip.
                        if (!srvflx) {
                            break;
                        }
                        //=> if the gateway and the UA on the same LAN skip.
                        if (uaAddress === srvflx) {
                            return;
                        }
                        //Adding a c line with the public address.
                        var parsedSdp = sip.parseSdp(sip.getPacketContent(sipPacketNextHop).toString("utf8"));
                        parsedSdp["m"][0]["c"] = __assign(__assign({}, parsedSdp["c"]), { "address": srvflx });
                        sip.setPacketContent(sipPacketNextHop, sip.stringifySdp(parsedSdp));
                    }
                    default: break;
                }
            };
        })();
        var asteriskPatches = function (sipPacket) {
            /*
            Patch for a bug in Asterisk:
            For some request ( CANCEL, BYE ... ) routes are included
            two times. This remove the duplicates.
            */
            if (sip.matchRequest(sipPacket) && !!sipPacket.headers.route) {
                sipPacket.headers.route = Array.from((new Map(sipPacket.headers.route.map(function (route) { return [sip.stringifyPath([route]), route]; }))).values());
            }
        };
        //NOTE: when the backend disconnect the socket will be closed.
        var backendSocket = backendConnection.get();
        return function (sipPacket) {
            asteriskPatches(sipPacket);
            var sipPacketNextHop = backendSocket.buildNextHopPacket(sipPacket);
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
exports.handle = handle;
