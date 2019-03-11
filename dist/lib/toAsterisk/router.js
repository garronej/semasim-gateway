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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var misc = require("../misc");
var backendConnection = require("../toBackend/connection");
/** Assert we have an active backend connection */
function handle(socket, connectionId, prPlatform) {
    var platform;
    prPlatform.then(function (v) { return platform = v; });
    //NOTE: when the backend disconnect the socket will be closed.
    var backendSocket = backendConnection.get();
    var uaAddress = misc.cid.parse(connectionId).uaSocket.remoteAddress;
    var iceHacks = function (sipPacketNextHop) {
        if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
            return;
        }
        var parsedSdp = sip.parseSdp(sip.getPacketContent(sipPacketNextHop).toString("utf8"));
        //Hack for Mozilla.
        parsedSdp["m"][0]["a"] = __spread(parsedSdp["m"][0]["a"], ["mid:0"]);
        //Platform will be set then.
        switch (platform) {
            case "android":
                var srvflx = sip.readSrflxAddrInSdp(sip.getPacketContent(sipPacketNextHop)
                    .toString("utf8"));
                if (!srvflx) {
                    //stun resolution failed skip.
                    break;
                }
                if (uaAddress !== srvflx) {
                    //The gateway and the UA are NOT on the same LAN.
                    //Adding a c line with the public address.
                    parsedSdp["m"][0]["c"] = __assign({}, parsedSdp["c"], { "address": srvflx });
                }
                break;
            default:
                break;
                ;
        }
        sip.setPacketContent(sipPacketNextHop, sip.stringifySdp(parsedSdp));
    };
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
    var onSipPacket = function (sipPacket) {
        asteriskPatches(sipPacket);
        var sipPacketNextHop = backendSocket.buildNextHopPacket(sipPacket);
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
