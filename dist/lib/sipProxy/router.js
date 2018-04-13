"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tls = require("tls");
const net = require("net");
const networkTools = require("../../tools/networkTools");
const sipLibrary = require("ts-sip");
const misc_1 = require("./misc");
const backendSocket = require("./backendSocket/index_sipProxy");
const asteriskSockets = require("./asteriskSockets");
const contactRegistrationMonitor = require("./contactsRegistrationMonitor");
const messages = require("./messages");
const c = require("./../_constants");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/router");
function createBackendSocket() {
    return __awaiter(this, void 0, void 0, function* () {
        let localIp;
        let host;
        while (true) {
            try {
                localIp = yield networkTools.getActiveInterfaceIp();
                /** SRV _sips._tcp.semasim.com => [{ name: sip.semasim.com }] */
                host = (yield networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;
                break;
            }
            catch (error) {
                debug(`Sip proxy start error: ${error.message}`);
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        let backendSocketInst = new sipLibrary.Socket(tls.connect({ host, "port": c.gatewayPort }));
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
        backendSocketInst.evtClose.attachOnce(() => asteriskSockets.flush());
        backendSocketInst.evtRequest.attach((sipRequestReceived) => __awaiter(this, void 0, void 0, function* () {
            let key = {
                "imsi": misc_1.readImsi(sipRequestReceived),
                "connectionId": misc_1.cid.read(sipRequestReceived)
            };
            let asteriskSocket = asteriskSockets.get(key);
            if (!asteriskSocket) {
                if (asteriskSocket === null) {
                    debug("connectionId expired, discarding".red);
                    return;
                }
                asteriskSocket = createAsteriskSocket(key.connectionId, backendSocketInst, localIp);
                asteriskSockets.set(key, asteriskSocket);
                let prContact = contactRegistrationMonitor.onNewAsteriskSocket(asteriskSocket);
                messages.onNewAsteriskSocket(asteriskSocket, prContact);
            }
            if (!asteriskSocket.evtConnect.postCount) {
                yield asteriskSocket.evtConnect.waitFor();
            }
            asteriskSocket.write(asteriskSocket.buildNextHopPacket(sipRequestReceived));
        }));
        backendSocketInst.evtResponse.attach(sipResponseReceived => {
            let imsi = misc_1.readImsi(sipResponseReceived);
            let connectionId = misc_1.cid.read(sipResponseReceived);
            let asteriskSocket = asteriskSockets.get({ connectionId, imsi });
            if (!asteriskSocket) {
                return;
            }
            asteriskSocket.write(asteriskSocket.buildNextHopPacket(sipResponseReceived));
        });
        return backendSocketInst;
    });
}
exports.createBackendSocket = createBackendSocket;
function createAsteriskSocket(connectionId, backendSocketInst, localIp) {
    let asteriskSocket = new sipLibrary.Socket(net.connect({
        "host": localIp,
        "port": 5060
    }));
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
    const clientSocketRemoteAddress = misc_1.cid.parse(connectionId).clientSocketRemoteAddress;
    //TODO: si if for webRtc it is desirable
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop) => {
        let sdp = sipLibrary.getPacketContent(sipPacketNextHop).toString("utf8");
        let gatewaySocketRemoteAddress = sipLibrary.readSrflxAddrInSdp(sdp);
        if (!gatewaySocketRemoteAddress ||
            (!sipLibrary.matchRequest(sipPacketNextHop) &&
                gatewaySocketRemoteAddress === clientSocketRemoteAddress))
            return;
        let parsedSdp = sipLibrary.parseSdp(sdp);
        parsedSdp.m[0].c = Object.assign({}, parsedSdp.c, { "address": gatewaySocketRemoteAddress });
        sipLibrary.setPacketContent(sipPacketNextHop, sipLibrary.stringifySdp(parsedSdp));
    };
    const onSipPacket = (sipPacketAsReceived) => {
        if (backendSocketInst.evtClose.postCount) {
            return;
        }
        let sipPacket = backendSocketInst.buildNextHopPacket(sipPacketAsReceived);
        if (sipLibrary.matchRequest(sipPacket)) {
            misc_1.cid.set(sipPacket, connectionId);
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
