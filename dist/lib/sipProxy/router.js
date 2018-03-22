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
//import { SyncEvent } from "ts-events-extended";
const networkTools = require("../../tools/networkTools");
const sipLibrary = require("../../tools/sipLibrary");
const types = require("./../types");
const misc_1 = require("./misc");
//import * as messages from "./messages/index_sipProxy";
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
        debug("Launch");
        let localIp;
        let host;
        while (true) {
            try {
                localIp = yield networkTools.getActiveInterfaceIp();
                /** sip.semasim.com */
                host = (yield networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name;
                break;
            }
            catch (error) {
                debug(`Sip proxy start error: ${error.message}`);
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        let backendSocketInst = new sipLibrary.Socket(tls.connect({ host, "port": c.gatewayPort }));
        backendSocket.set(backendSocketInst);
        backendSocketInst.evtClose.attachOnce(() => asteriskSockets.flush());
        backendSocketInst.evtData.attach(data => console.log("BK-GW=>GW\n", `${data.toString("utf8").yellow}`));
        backendSocketInst.evtRequest.attach((sipRequestReceived) => __awaiter(this, void 0, void 0, function* () {
            let imsi = misc_1.readImsi(sipRequestReceived);
            let connectionId = misc_1.cid.read(sipRequestReceived);
            let asteriskSocket = asteriskSockets.get({ connectionId, imsi });
            if (!asteriskSocket) {
                if (asteriskSocket === null) {
                    return;
                }
                asteriskSocket = createAsteriskSocket(connectionId, backendSocketInst, localIp);
                let key = { connectionId, imsi };
                asteriskSockets.set(key, asteriskSocket);
                let prContact = contactRegistrationMonitor.onNewAsteriskSocket(asteriskSocket, key);
                messages.onNewAsteriskSocket(asteriskSocket, prContact);
            }
            if (!asteriskSocket.evtConnect.postCount) {
                yield asteriskSocket.evtConnect.waitFor();
            }
            let sipRequest = asteriskSocket.buildNextHopPacket(sipRequestReceived);
            if (sipRequest.method === "REGISTER") {
                let { params } = sipLibrary.parseUri(sipLibrary.getContact(sipRequest).uri);
                let paramsAoR = sipLibrary.getContact(sipRequest).params;
                //TODO: Very important base64 is not safe for email as may contain =
                sipRequest.headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                    "ua_instance": paramsAoR["+sip.instance"],
                    "ua_userEmail": (() => {
                        try {
                            return Buffer.from((params["base64_email"] || paramsAoR["base64_email"]), "base64").toString("utf8");
                        }
                        catch (_a) {
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
                    parsedUri.params = { "stamp": `${misc_1.cid.parse(connectionId).timestamp}` };
                    contactAoR.uri = sipLibrary.stringifyUri(parsedUri);
                }
            })();
            console.log("GW=>AST\n", `${sipLibrary.stringify(sipRequest).yellow}`);
            asteriskSocket.write(sipRequest);
        }));
        backendSocketInst.evtResponse.attach(sipResponseReceived => {
            let imsi = misc_1.readImsi(sipResponseReceived);
            let connectionId = misc_1.cid.read(sipResponseReceived);
            let asteriskSocket = asteriskSockets.get({ connectionId, imsi });
            if (!asteriskSocket) {
                return;
            }
            console.log("GW=>AST\n", `${sipLibrary.stringify(asteriskSocket.buildNextHopPacket(sipResponseReceived)).yellow}`);
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
    asteriskSocket.evtData.attach(data => console.log("GW<=AST\n", data.toString("utf8")));
    //TODO: si if for webRtc it is desirable
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    const fixSdp = (sipPacketNextHop) => {
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
