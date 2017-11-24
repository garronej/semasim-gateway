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
var sipApiBackend = require("./sipApiClientBackend");
var sipApi_1 = require("./sipApi");
var sipContact_1 = require("./sipContact");
var db = require("./db");
var trackable_map_1 = require("trackable-map");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy");
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
exports.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
var backendSocket;
var evtNewBackendSocketConnect = new ts_events_extended_1.VoidSyncEvent();
function getBackendSocket() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(!backendSocket ||
                        backendSocket.evtClose.postCount ||
                        !backendSocket.evtConnect.postCount)) return [3 /*break*/, 2];
                    return [4 /*yield*/, evtNewBackendSocketConnect.waitFor()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, backendSocket];
            }
        });
    });
}
exports.getBackendSocket = getBackendSocket;
var asteriskSockets;
(function (asteriskSockets) {
    var map = new Map();
    var mapAstSockContact = new trackable_map_1.TrackableMap();
    function set(connectionId, imei, socket) {
        var key = "" + connectionId + imei;
        socket.evtClose.attachOnce(function () { return map.set(key, null); });
        map.set(key, socket);
        db.asterisk.getEvtNewContact().attachOncePrepend(function (contact) { return (contact.connectionId === connectionId &&
            contact.uaEndpoint.endpoint.dongle.imei === imei); }, 6000, function (contact) { return mapAstSockContact.set(socket, contact); }).catch(function () { return socket.destroy(); });
    }
    asteriskSockets.set = set;
    function get(connectionId, imei) {
        return map.get("" + connectionId + imei);
    }
    asteriskSockets.get = get;
    function getContact(socket) {
        return __awaiter(this, void 0, void 0, function () {
            var contact, boundTo_1, _a, contact_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        contact = mapAstSockContact.get(socket);
                        if (!contact) return [3 /*break*/, 1];
                        return [2 /*return*/, contact];
                    case 1:
                        boundTo_1 = [];
                        socket.evtClose.attachOnce(boundTo_1, function () {
                            return mapAstSockContact.evtSet.detach(boundTo_1);
                        });
                        return [4 /*yield*/, mapAstSockContact.evtSet.attachOnce(function (_a) {
                                var _b = __read(_a, 2), _ = _b[0], s = _b[1];
                                return s === socket;
                            }, boundTo_1, function () { })];
                    case 2:
                        _a = __read.apply(void 0, [_b.sent(), 1]), contact_1 = _a[0];
                        socket.evtClose.detach(boundTo_1);
                        return [2 /*return*/, contact_1];
                }
            });
        });
    }
    asteriskSockets.getContact = getContact;
    function flush() {
        try {
            for (var _a = __values(map.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                var socket = _b.value;
                if (!socket)
                    continue;
                socket.destroy();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _c;
    }
    asteriskSockets.flush = flush;
    mapAstSockContact.set = function set(socket, contact) {
        var self = this;
        var boundTo = [];
        socket.evtClose.attachOnce(function () {
            db.asterisk.getEvtExpiredContact().detach(boundTo);
            self.delete(socket);
            db.asterisk.deleteContact(contact);
        });
        db.asterisk.getEvtExpiredContact().attachOnce(function (expiredContact) { return expiredContact.id === contact.id; }, boundTo, function () {
            debug("expired contact");
            socket.destroy();
            sipApiBackend.forceContactToReRegister.makeCall(contact);
        });
        var oldContact = self.find(function (oldContact) { return sipContact_1.Contact.UaEndpoint.areSame(oldContact.uaEndpoint, contact.uaEndpoint); });
        if (oldContact) {
            debug("ua re-register with an other connection");
            var oldSocket = self.keyOf(oldContact);
            oldSocket.destroy();
        }
        return trackable_map_1.TrackableMap.prototype.set.call(self, socket, contact);
    };
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
                    //TODO: see if it really does it's job ===> it does not!!! TODO implement it
                    backendSocket.setKeepAlive(true);
                    sipApi_1.startListening(backendSocket);
                    /*
                    backendSocket.evtPacket.attach(sipPacket =>
                        console.log("From backend:\n", sipLibrary.stringify(sipPacket).yellow, "\n\n")
                    );
                    backendSocket.evtData.attach(chunk =>
                        console.log("From backend raw:\n", chunk.yellow, "\n\n")
                    );
                    */
                    backendSocket.evtConnect.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _this = this;
                        var handledUa, _loop_1, _a, _b, _c, imei, e_2_1, e_2, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    debug("Connection established with backend");
                                    evtNewBackendSocketConnect.post();
                                    handledUa = new Set();
                                    _loop_1 = function (imei) {
                                        sipApiBackend.claimDongle.makeCall(imei).then(function (isGranted) { return __awaiter(_this, void 0, void 0, function () {
                                            var uas, uas_1, uas_1_1, ua, e_3, _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        if (!isGranted)
                                                            return [2 /*return*/];
                                                        return [4 /*yield*/, db.semasim.getUas(imei)];
                                                    case 1:
                                                        uas = _b.sent();
                                                        try {
                                                            for (uas_1 = __values(uas), uas_1_1 = uas_1.next(); !uas_1_1.done; uas_1_1 = uas_1.next()) {
                                                                ua = uas_1_1.value;
                                                                if (handledUa.has(ua.instance))
                                                                    continue;
                                                                sipApiBackend.sendPushNotification.makeCall(ua);
                                                                handledUa.add(ua.instance);
                                                            }
                                                        }
                                                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                                        finally {
                                                            try {
                                                                if (uas_1_1 && !uas_1_1.done && (_a = uas_1.return)) _a.call(uas_1);
                                                            }
                                                            finally { if (e_3) throw e_3.error; }
                                                        }
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                    };
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 6, 7, 8]);
                                    return [4 /*yield*/, db.semasim.getDonglesLastConnection()];
                                case 2:
                                    _a = __values.apply(void 0, [_e.sent()]), _b = _a.next();
                                    _e.label = 3;
                                case 3:
                                    if (!!_b.done) return [3 /*break*/, 5];
                                    _c = __read(_b.value, 1), imei = _c[0];
                                    _loop_1(imei);
                                    _e.label = 4;
                                case 4:
                                    _b = _a.next();
                                    return [3 /*break*/, 3];
                                case 5: return [3 /*break*/, 8];
                                case 6:
                                    e_2_1 = _e.sent();
                                    e_2 = { error: e_2_1 };
                                    return [3 /*break*/, 8];
                                case 7:
                                    try {
                                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                    return [7 /*endfinally*/];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); });
                    backendSocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                        var _this = this;
                        var headers, connectionId, imei, asteriskSocket, contactAoR, parsedUri, branch;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    headers = sipRequest.headers;
                                    connectionId = parseInt(headers.via[0].params["connection_id"]);
                                    imei = sipLibrary.parseUri(headers.from.uri).user;
                                    asteriskSocket = asteriskSockets.get(connectionId, imei);
                                    if (asteriskSocket === undefined) {
                                        asteriskSocket = createAsteriskSocket(connectionId, imei, backendSocket);
                                        asteriskSocket.misc["received"] = headers.via[0].params["received"];
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
                                        headers["user-agent"] = sipContact_1.PsContact.stringifyMisc({
                                            "ua_instance": contactAoR.params["+sip.instance"],
                                            "ua_software": headers["user-agent"],
                                            connectionId: connectionId,
                                            "pushToken": (function () {
                                                var params = sipLibrary.parseUri(contactAoR.uri).params;
                                                var type = params["pn-type"];
                                                var token = params["pn-tok"];
                                                return (type && token) ? { type: type, token: token } : undefined;
                                            })()
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
                        var imei = sipLibrary.parseUri(sipResponse.headers.to.uri).user;
                        var asteriskSocket = asteriskSockets.get(connectionId, imei);
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
function createAsteriskSocket(connectionId, imei, backendSocket) {
    var asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    asteriskSockets.set(connectionId, imei, asteriskSocket);
    /*
    asteriskSocket.evtPacket.attach(sipPacket =>
        console.log("From Asterisk:\n", sipLibrary.stringify(sipPacket).grey, "\n\n")
    );
    asteriskSocket.evtData.attach(chunk =>
        console.log("From Asterisk raw:\n", chunk.grey, "\n\n")
    );
    */
    asteriskSocket.evtPacket.attachPrepend(function (_a) {
        var headers = _a.headers;
        return headers["content-type"] === "application/sdp";
    }, function (sipPacket) {
        var sdp = sipPacket.content;
        var srflxAddr = sipLibrary.readSrflxAddrInSdp(sdp);
        if (!srflxAddr ||
            (!sipLibrary.matchRequest(sipPacket) &&
                srflxAddr === asteriskSocket.misc["received"]))
            return;
        var parsedSdp = sipLibrary.parseSdp(sdp);
        parsedSdp.m[0].c = __assign({}, parsedSdp.c, { "address": srflxAddr });
        sipPacket.content = sipLibrary.stringifySdp(parsedSdp);
    });
    asteriskSocket.evtRequest.attach(function (sipRequest) {
        if (backendSocket.evtClose.postCount)
            return;
        var branch = backendSocket.addViaHeader(sipRequest, { "connection_id": "" + connectionId });
        backendSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
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
