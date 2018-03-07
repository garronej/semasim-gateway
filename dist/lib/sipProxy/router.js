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
const sipLibrary = require("../../tools/sipLibrary");
const types = require("./../types");
const misc_1 = require("./misc");
const messages = require("./messages/index_sipProxy");
const backendSocket = require("./backendSocket/index_sipProxy");
const asteriskSockets = require("./asteriskSockets/index_sipProxy");
const c = require("./../_constants");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/router");
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Launch");
        let localIp;
        let host;
        try {
            localIp = yield networkTools.getActiveInterfaceIp();
            /** sip.semasim.com */
            host = (yield networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;
        }
        catch (error) {
            debug(`Sip proxy start error: ${error.message}`);
            yield new Promise(resolve => setTimeout(resolve, 5000));
            launch();
            return;
        }
        let backendSocketInst = new sipLibrary.Socket(tls.connect({
            host,
            "port": c.gatewayPort
        }));
        backendSocket.set(backendSocketInst);
        backendSocketInst.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
            debug("Backend socket closed, waiting and restarting");
            asteriskSockets.flush();
            let delay = (function getRandomArbitrary(min, max) {
                return Math.floor(Math.random() * (max - min) + min);
            })(3000, 5000);
            debug(`Delay before restarting: ${delay}ms`);
            yield new Promise(resolve => setTimeout(resolve, delay));
            launch();
        }));
        backendSocketInst.evtData.attach(data => console.log(`\nFrom backend:\n${data.toString("binary").yellow}\n\n`));
        backendSocketInst.evtRequest.attach((sipRequestReceived) => __awaiter(this, void 0, void 0, function* () {
            let imsi = misc_1.readImsi(sipRequestReceived);
            let connectionId = misc_1.cid.read(sipRequestReceived);
            let asteriskSocket = asteriskSockets.get({ connectionId, imsi });
            if (!asteriskSocket) {
                if (asteriskSocket === null) {
                    return;
                }
                asteriskSocket = createAsteriskSocket(connectionId, backendSocketInst, localIp);
                asteriskSockets.set({ connectionId, imsi }, asteriskSocket);
            }
            if (!asteriskSocket.evtConnect.postCount) {
                yield asteriskSocket.evtConnect.waitFor();
            }
            let sipRequest = asteriskSocket.buildNextHopPacket(sipRequestReceived);
            if (sipRequest.method === "REGISTER") {
                let { params } = sipLibrary.parseUri(sipLibrary.getContact(sipRequest).uri);
                sipRequest.headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                    "ua_instance": sipLibrary.getContact(sipRequest).params["+sip.instance"],
                    "ua_userEmail": Buffer.from(params["base64_email"], "base64").toString("utf8"),
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
                asteriskSocket.evtResponse.attachOnce(sipResponse => sipLibrary.isResponse(sipRequest, sipResponse), ({ status }) => __awaiter(this, void 0, void 0, function* () {
                    if (status !== 202) {
                        return;
                    }
                    messages.onIncomingSipMessage(yield asteriskSockets.getSocketContact(asteriskSocket), sipRequestReceived);
                }));
            }
            asteriskSocket.write(sipRequest);
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
    });
}
exports.launch = launch;
function createAsteriskSocket(connectionId, backendSocketInst, localIp) {
    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    asteriskSocket.evtData.attach(data => console.log(`\nFrom Asterisk:\n${data.toString("binary").grey}\n\n`));
    //TODO: change for webRtc
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop) => {
        if (sipPacketNextHop.headers["content-type"] !== "application/sdp") {
            return;
        }
        let sdp = sipLibrary.getPacketContent(sipPacketNextHop).toString("utf8");
        let gatewaySocketRemoteAddress = sipLibrary.readSrflxAddrInSdp(sdp);
        if (!gatewaySocketRemoteAddress ||
            (!sipLibrary.matchRequest(sipPacketNextHop) &&
                gatewaySocketRemoteAddress === misc_1.cid.parse(connectionId).clientSocketRemoteAddress))
            return;
        let parsedSdp = sipLibrary.parseSdp(sdp);
        parsedSdp.m[0].c = Object.assign({}, parsedSdp.c, { "address": gatewaySocketRemoteAddress });
        sipLibrary.setPacketContent(sipPacketNextHop, sipLibrary.stringifySdp(parsedSdp));
    };
    asteriskSocket.evtRequest.attach(sipRequestReceived => {
        if (backendSocketInst.evtClose.postCount) {
            return;
        }
        let sipRequest = backendSocketInst.buildNextHopPacket(sipRequestReceived);
        misc_1.cid.set(sipRequest, connectionId);
        fixSdp(sipRequest);
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
            messages.onOutgoingSipMessage(sipRequest, backendSocketInst.evtResponse.waitFor(sipResponse => sipLibrary.isResponse(sipRequest, sipResponse), 5000));
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
