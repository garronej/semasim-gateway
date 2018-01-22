"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tls = require("tls");
var net = require("net");
var networkTools = require("../tools/networkTools");
var ts_events_extended_1 = require("ts-events-extended");
var sipLibrary = require("../tools/sipLibrary");
var sipContact_1 = require("./sipContact");
var db = require("./db");
var sipApiBackend = require("./sipApiBackedClientImplementation");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy");
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
exports.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
var backendSocket;
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
    var map = new Map();
    function getContacts(imsi) {
        var match;
        if (imsi) {
            match = function (contact) { return contact.uaSim.imsi === imsi; };
        }
        else {
            match = function () { return true; };
        }
        var contacts = [];
        try {
            for (var _a = __values(map.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                var socket = _b.value;
                if (socket === null)
                    continue;
                var contact = socket.misc["contact"];
                if (!contact)
                    continue;
                if (!match(contact))
                    continue;
                contacts.push(contact);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return contacts;
        var e_1, _c;
    }
    asteriskSockets.getContacts = getContacts;
    function set(connectionId, imsi, socket) {
        var key = "" + connectionId + imsi;
        socket.evtClose.attachOnce(function () { return map.set(key, null); });
        var prContact = db.asterisk.evtNewContact.attachOncePrepend(function (contact) { return (contact.connectionId === connectionId &&
            contact.uaSim.imsi === imsi); }, 6000, function (contact) {
            socket.evtClose.attachOnce(function () {
                db.asterisk.evtExpiredContact.detach(prContact);
                db.asterisk.deleteContact(contact);
            });
            db.asterisk.evtExpiredContact.attachOnce(function (expiredContact) { return expiredContact.id === contact.id; }, prContact, function () {
                debug("expired contact");
                socket.destroy();
                sipApiBackend.forceContactToRegister(contact);
            });
            try {
                for (var _a = __values(map.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var socket_i = _b.value;
                    if (socket_i === null)
                        continue;
                    var contact_i = socket_i.misc["contact"];
                    if (!contact_i)
                        continue;
                    if (sipContact_1.Contact.UaSim.areSame(contact_i.uaSim, contact.uaSim)) {
                        debug("ua re-register with an other connection");
                        socket_i.destroy();
                        break;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_2) throw e_2.error; }
            }
            socket.misc["contact"] = contact;
            var e_2, _c;
        });
        prContact.catch(function () { return socket.destroy(); });
        socket.misc["prContact"] = prContact;
        map.set(key, socket);
    }
    asteriskSockets.set = set;
    function get(connectionId, imsi) {
        return map.get("" + connectionId + imsi);
    }
    asteriskSockets.get = get;
    function getContact(socket) {
        return socket.misc["contact"] || socket.misc["prContact"];
    }
    asteriskSockets.getContact = getContact;
    function flush() {
        try {
            for (var _a = __values(map.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                var socket = _b.value;
                if (socket === null)
                    continue;
                socket.destroy();
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var e_3, _c;
    }
    asteriskSockets.flush = flush;
})(asteriskSockets || (asteriskSockets = {}));
var localIp = "";
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    debug((localIp ? "re-" : "") + "Starting");
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, networkTools.getActiveInterfaceIp()];
                case 2:
                    localIp = _h.sent();
                    return [3 /*break*/, 5];
                case 3:
                    _a = _h.sent();
                    debug("No active interface IP scheduling retry...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 4:
                    _h.sent();
                    start();
                    return [2 /*return*/];
                case 5:
                    _c = (_b = sipLibrary.Socket).bind;
                    _e = (_d = tls).connect;
                    _f = {};
                    _g = "host";
                    return [4 /*yield*/, networkTools.resolveSrv("_sips._tcp." + _constants_1.c.shared.domain)];
                case 6:
                    backendSocket = new (_c.apply(_b, [void 0, _e.apply(_d, [(_f[_g] = (_h.sent())[0].name,
                                _f["port"] = _constants_1.c.shared.gatewayPort,
                                _f)])]))();
                    backendSocket.setKeepAlive(true);
                    backendSocket.evtData.attach(function (chunk) {
                        return console.log("\nFrom backend:\n" + chunk.yellow + "\n\n");
                    });
                    backendSocket.evtConnect.attachOnce(function () {
                        return exports.evtNewBackendSocketConnect.post(backendSocket);
                    });
                    backendSocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                        var _this = this;
                        var headers, connectionId, imsi, asteriskSocket, uaPublicIp, contactAoR, contactParams_1, parsedUri, branch;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    headers = sipRequest.headers;
                                    connectionId = parseInt(headers.via[0].params["connection_id"]);
                                    imsi = sipLibrary.parseUri(headers.from.uri).user;
                                    asteriskSocket = asteriskSockets.get(connectionId, imsi);
                                    if (asteriskSocket === undefined) {
                                        uaPublicIp = headers.via[0].params["received"];
                                        asteriskSocket = createAsteriskSocket(connectionId, imsi, uaPublicIp, backendSocket);
                                    }
                                    else if (asteriskSocket === null) {
                                        return [2 /*return*/];
                                    }
                                    if (!!asteriskSocket.evtConnect.postCount) return [3 /*break*/, 2];
                                    return [4 /*yield*/, asteriskSocket.evtConnect.waitFor()];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    contactAoR = headers.contact ? headers.contact[0] : undefined;
                                    if (sipRequest.method === "REGISTER") {
                                        contactParams_1 = sipLibrary.parseUri(contactAoR.uri).params;
                                        headers["user-agent"] = sipContact_1.PsContact.stringifyMisc({
                                            "ua_instance": contactAoR.params["+sip.instance"],
                                            "ua_userEmail": (new Buffer(contactParams_1["base64_email"], "base64")).toString("utf8"),
                                            "ua_platform": (function () {
                                                switch (contactParams_1["pn-type"]) {
                                                    case "google":
                                                    case "firebase":
                                                        return "android";
                                                    case "apple":
                                                        return "iOS";
                                                    default:
                                                        return "other";
                                                }
                                            })(),
                                            "ua_pushToken": contactParams_1["pn-tok"] || "",
                                            "ua_software": headers["user-agent"],
                                            connectionId: connectionId
                                        });
                                        asteriskSocket.addPathHeader(sipRequest);
                                    }
                                    else {
                                        asteriskSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);
                                    }
                                    if (contactAoR) {
                                        parsedUri = sipLibrary.parseUri(contactAoR.uri);
                                        parsedUri.params = {};
                                        contactAoR.uri = sipLibrary.stringifyUri(parsedUri);
                                    }
                                    branch = asteriskSocket.addViaHeader(sipRequest);
                                    //TODO match with authentication
                                    if (sipLibrary.isPlainMessageRequest(sipRequest)) {
                                        //TODO: why prepend => because via header is to be modified
                                        asteriskSocket.evtResponse.attachOncePrepend(function (_a) {
                                            var headers = _a.headers;
                                            return headers.via[0].params["branch"] === branch;
                                        }, function (sipResponse) { return __awaiter(_this, void 0, void 0, function () {
                                            var fromContact;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        if (sipResponse.status !== 202)
                                                            return [2 /*return*/];
                                                        return [4 /*yield*/, asteriskSockets.getContact(asteriskSocket)];
                                                    case 1:
                                                        fromContact = _a.sent();
                                                        exports.evtIncomingMessage.post({ fromContact: fromContact, sipRequest: sipRequest });
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                    }
                                    asteriskSocket.write(sipRequest);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    backendSocket.evtResponse.attach(function (sipResponse) {
                        var connectionId = parseInt(sipResponse.headers.via[0].params["connection_id"]);
                        var imsi = sipLibrary.parseUri(sipResponse.headers.to.uri).user;
                        var asteriskSocket = asteriskSockets.get(connectionId, imsi);
                        if (!asteriskSocket)
                            return;
                        asteriskSocket.pushRecordRoute(sipResponse, false);
                        sipResponse.headers.via.shift();
                        asteriskSocket.write(sipResponse);
                    });
                    backendSocket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                        var delay;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    debug("Backend socket closed, waiting and restarting");
                                    asteriskSockets.flush();
                                    delay = (function getRandomArbitrary(min, max) {
                                        return Math.floor(Math.random() * (max - min) + min);
                                    })(3000, 5000);
                                    debug("Delay before restarting: " + delay + "ms");
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
                                case 1:
                                    _a.sent();
                                    start();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
exports.start = start;
function createAsteriskSocket(connectionId, imsi, uaPublicIp, backendSocket) {
    var asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    asteriskSockets.set(connectionId, imsi, asteriskSocket);
    asteriskSocket.evtData.attach(function (chunk) {
        return console.log("\nFrom Asterisk:\n" + chunk.grey + "\n\n");
    });
    /** Hot-fix to make linphone ICE implementation compatible with asterisk */
    (function () {
        var matcher = function (sipPacket) {
            return sipPacket.headers["content-type"] === "application/sdp";
        };
        var handler = function (sipPacket) {
            var sdp = sipPacket.content;
            var gatewayPublicIp = sipLibrary.readSrflxAddrInSdp(sdp);
            if (!gatewayPublicIp ||
                (!sipLibrary.matchRequest(sipPacket) &&
                    gatewayPublicIp === uaPublicIp))
                return;
            var parsedSdp = sipLibrary.parseSdp(sdp);
            parsedSdp.m[0].c = __assign({}, parsedSdp.c, { "address": gatewayPublicIp });
            sipPacket.content = sipLibrary.stringifySdp(parsedSdp);
        };
        asteriskSocket.evtRequest.attachPrepend(matcher, handler);
        asteriskSocket.evtResponse.attachPrepend(matcher, handler);
    })();
    asteriskSocket.evtRequest.attach(function (sipRequest) {
        if (backendSocket.evtClose.postCount)
            return;
        var branch = backendSocket.addViaHeader(sipRequest, { "connection_id": "" + connectionId });
        backendSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
            //NOTE: we do not use waitFor because header via is modified when the response is handled
            var prSipResponse = backendSocket.evtResponse.attachOncePrepend(function (_a) {
                var headers = _a.headers;
                return headers.via[0].params["branch"] === branch;
            }, 5000, function () { });
            exports.evtOutgoingMessage.post({ sipRequest: sipRequest, prSipResponse: prSipResponse });
        }
        backendSocket.write(sipRequest);
    });
    asteriskSocket.evtResponse.attach(function (sipResponse) {
        if (backendSocket.evtClose.postCount)
            return;
        backendSocket.pushRecordRoute(sipResponse, true);
        sipResponse.headers.via.shift();
        backendSocket.write(sipResponse);
    });
    return asteriskSocket;
}
