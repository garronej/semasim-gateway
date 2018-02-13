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
const networkTools = require("../tools/networkTools");
const ts_events_extended_1 = require("ts-events-extended");
const sipLibrary = require("../tools/sipLibrary");
const dbAsterisk = require("./dbAsterisk");
const types = require("./types");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const c = require("./_constants");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy");
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
exports.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
let backendSocket;
exports.evtNewBackendSocketConnect = new ts_events_extended_1.SyncEvent();
function getBackendSocket() {
    if (!backendSocket ||
        backendSocket.evtClose.postCount ||
        !backendSocket.evtConnect.postCount) {
        return exports.evtNewBackendSocketConnect.waitFor();
    }
    else {
        return backendSocket;
    }
}
exports.getBackendSocket = getBackendSocket;
function getContacts(imsi) {
    return asteriskSockets.getContacts(imsi);
}
exports.getContacts = getContacts;
var asteriskSockets;
(function (asteriskSockets) {
    const map = new Map();
    function getContacts(imsi) {
        let match;
        if (imsi) {
            match = contact => contact.uaSim.imsi === imsi;
        }
        else {
            match = () => true;
        }
        let contacts = [];
        for (let socket of map.values()) {
            if (socket === null)
                continue;
            let contact = socket.misc["contact"];
            if (!contact)
                continue;
            if (!match(contact))
                continue;
            contacts.push(contact);
        }
        return contacts;
    }
    asteriskSockets.getContacts = getContacts;
    function set(connectionId, imsi, socket) {
        let key = `${connectionId}${imsi}`;
        socket.evtClose.attachOnce(() => map.set(key, null));
        let prContact = dbAsterisk.evtNewContact.attachOncePrepend(contact => (contact.connectionId === connectionId &&
            contact.uaSim.imsi === imsi), 6000, contact => {
            socket.evtClose.attachOnce(() => {
                dbAsterisk.evtExpiredContact.detach(prContact);
                dbAsterisk.deleteContact(contact);
            });
            dbAsterisk.evtExpiredContact.attachOnce(expiredContact => expiredContact.id === contact.id, prContact, () => {
                debug("expired contact");
                socket.destroy();
                sipApiBackend.forceContactToRegister(contact);
            });
            for (let socket_i of map.values()) {
                if (socket_i === null)
                    continue;
                let contact_i = socket_i.misc["contact"];
                if (!contact_i)
                    continue;
                if (types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {
                    debug("ua re-register with an other connection");
                    socket_i.destroy();
                    break;
                }
            }
            socket.misc["contact"] = contact;
        });
        prContact.catch(() => socket.destroy());
        socket.misc["prContact"] = prContact;
        map.set(key, socket);
    }
    asteriskSockets.set = set;
    function get(connectionId, imsi) {
        return map.get(`${connectionId}${imsi}`);
    }
    asteriskSockets.get = get;
    function getContact(socket) {
        return socket.misc["contact"] || socket.misc["prContact"];
    }
    asteriskSockets.getContact = getContact;
    function flush() {
        for (let socket of map.values()) {
            if (socket === null)
                continue;
            socket.destroy();
        }
    }
    asteriskSockets.flush = flush;
})(asteriskSockets || (asteriskSockets = {}));
let localIp = "";
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`${localIp ? "re-" : ""}Starting`);
        try {
            localIp = yield networkTools.getActiveInterfaceIp();
        }
        catch (_a) {
            debug("No active interface IP scheduling retry...");
            yield new Promise(resolve => setTimeout(resolve, 5000));
            start();
            return;
        }
        backendSocket = new sipLibrary.Socket(tls.connect({
            "host": (yield networkTools.resolveSrv(`_sips._tcp.${c.domain}`))[0].name,
            "port": c.gatewayPort
        }));
        backendSocket.setKeepAlive(true);
        backendSocket.evtData.attach(chunk => console.log(`\nFrom backend:\n${chunk.yellow}\n\n`));
        backendSocket.evtConnect.attachOnce(() => exports.evtNewBackendSocketConnect.post(backendSocket));
        backendSocket.evtRequest.attach((sipRequest) => __awaiter(this, void 0, void 0, function* () {
            let { headers } = sipRequest;
            let connectionId = parseInt(headers.via[0].params["connection_id"]);
            let imsi = sipLibrary.parseUri(headers.from.uri).user;
            let asteriskSocket = asteriskSockets.get(connectionId, imsi);
            if (asteriskSocket === undefined) {
                let uaPublicIp = headers.via[0].params["received"];
                asteriskSocket = createAsteriskSocket(connectionId, imsi, uaPublicIp, backendSocket);
            }
            else if (asteriskSocket === null) {
                return;
            }
            if (!asteriskSocket.evtConnect.postCount)
                yield asteriskSocket.evtConnect.waitFor();
            let contactAoR = headers.contact ? headers.contact[0] : undefined;
            if (sipRequest.method === "REGISTER") {
                let contactParams = sipLibrary.parseUri(contactAoR.uri).params;
                headers["user-agent"] = types.misc.smuggleMiscInPsContactUserAgent({
                    "ua_instance": contactAoR.params["+sip.instance"],
                    "ua_userEmail": Buffer.from(contactParams["base64_email"], "base64").toString("utf8"),
                    "ua_platform": (() => {
                        switch (contactParams["pn-type"]) {
                            case "google":
                            case "firebase":
                                return "android";
                            case "apple":
                                return "iOS";
                            default:
                                return "other";
                        }
                    })(),
                    "ua_pushToken": contactParams["pn-tok"] || "",
                    "ua_software": headers["user-agent"],
                    connectionId
                });
                asteriskSocket.addPathHeader(sipRequest);
            }
            else {
                asteriskSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);
            }
            if (contactAoR) {
                let parsedUri = sipLibrary.parseUri(contactAoR.uri);
                parsedUri.params = {};
                contactAoR.uri = sipLibrary.stringifyUri(parsedUri);
            }
            let branch = asteriskSocket.addViaHeader(sipRequest);
            //TODO match with authentication
            if (sipLibrary.isPlainMessageRequest(sipRequest)) {
                //TODO: why prepend => because via header is to be modified
                asteriskSocket.evtResponse.attachOncePrepend(({ headers }) => headers.via[0].params["branch"] === branch, (sipResponse) => __awaiter(this, void 0, void 0, function* () {
                    if (sipResponse.status !== 202)
                        return;
                    let fromContact = yield asteriskSockets.getContact(asteriskSocket);
                    exports.evtIncomingMessage.post({ fromContact, sipRequest });
                }));
            }
            asteriskSocket.write(sipRequest);
        }));
        backendSocket.evtResponse.attach(sipResponse => {
            let connectionId = parseInt(sipResponse.headers.via[0].params["connection_id"]);
            let imsi = sipLibrary.parseUri(sipResponse.headers.to.uri).user;
            let asteriskSocket = asteriskSockets.get(connectionId, imsi);
            if (!asteriskSocket)
                return;
            asteriskSocket.pushRecordRoute(sipResponse, false);
            sipResponse.headers.via.shift();
            asteriskSocket.write(sipResponse);
        });
        backendSocket.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
            debug("Backend socket closed, waiting and restarting");
            asteriskSockets.flush();
            let delay = (function getRandomArbitrary(min, max) {
                return Math.floor(Math.random() * (max - min) + min);
            })(3000, 5000);
            debug(`Delay before restarting: ${delay}ms`);
            yield new Promise(resolve => setTimeout(resolve, delay));
            start();
        }));
    });
}
exports.start = start;
function createAsteriskSocket(connectionId, imsi, uaPublicIp, backendSocket) {
    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    asteriskSockets.set(connectionId, imsi, asteriskSocket);
    asteriskSocket.evtData.attach(chunk => console.log(`\nFrom Asterisk:\n${chunk.grey}\n\n`));
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    (() => {
        let matcher = (sipPacket) => sipPacket.headers["content-type"] === "application/sdp";
        let handler = (sipPacket) => {
            let sdp = sipPacket.content;
            let gatewayPublicIp = sipLibrary.readSrflxAddrInSdp(sdp);
            if (!gatewayPublicIp ||
                (!sipLibrary.matchRequest(sipPacket) &&
                    gatewayPublicIp === uaPublicIp))
                return;
            let parsedSdp = sipLibrary.parseSdp(sdp);
            parsedSdp.m[0].c = Object.assign({}, parsedSdp.c, { "address": gatewayPublicIp });
            sipPacket.content = sipLibrary.stringifySdp(parsedSdp);
        };
        asteriskSocket.evtRequest.attachPrepend(matcher, handler);
        asteriskSocket.evtResponse.attachPrepend(matcher, handler);
    })();
    asteriskSocket.evtRequest.attach(sipRequest => {
        if (backendSocket.evtClose.postCount)
            return;
        let branch = backendSocket.addViaHeader(sipRequest, { "connection_id": `${connectionId}` });
        backendSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
            //NOTE: we do not use waitFor because header via is modified when the response is handled
            let prSipResponse = backendSocket.evtResponse.attachOncePrepend(({ headers }) => headers.via[0].params["branch"] === branch, 5000, () => { });
            exports.evtOutgoingMessage.post({ sipRequest, prSipResponse });
        }
        backendSocket.write(sipRequest);
    });
    asteriskSocket.evtResponse.attach(sipResponse => {
        if (backendSocket.evtClose.postCount)
            return;
        backendSocket.pushRecordRoute(sipResponse, true);
        sipResponse.headers.via.shift();
        backendSocket.write(sipResponse);
    });
    return asteriskSocket;
}
