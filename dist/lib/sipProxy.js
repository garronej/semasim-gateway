"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var tls = require("tls");
var net = require("net");
var network = require("network");
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
var informativeHostname = "semasim-gateway.invalid";
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
var asteriskSockets = new Map();
asteriskSockets.set = function set(flowToken, socket) {
    var self = this;
    socket.evtClose.attachOnce(function () {
        return Map.prototype.set.call(self, flowToken, null);
    });
    return Map.prototype.set.call(self, flowToken, socket);
};
var mapAstSockContact = new trackable_map_1.TrackableMap();
//Parfois on a old contact et contact en même temps dans la db
//si on wakeUp un contact qui a ete overwrite ou est entrain de l'être
//alors le backend vas faire un qualify qui vas fail et enchainer avec une push
//ce qui vas forcer le ré enregistrement.
//Normalement quand on fait getContacts on a jamais un doublon pk delete contact est appeler avant
//syncronement avent que des trigers soit declancher pour le nvx contact.
mapAstSockContact.set = function set(socket, contact) {
    debug("associate contact to asteriskSocket: " + contact.flowToken);
    var self = this;
    var boundTo = [];
    socket.evtClose.attachOnce(function () {
        debug("closed asteriskSocket: " + contact.flowToken);
        db.asterisk.getEvtExpiredContact().detach(boundTo),
            self.delete(socket);
        db.asterisk.deleteContact(contact);
    });
    db.asterisk.getEvtExpiredContact().attachOnce(function (expiredContact) { return expiredContact.ps.id === contact.ps.id; }, boundTo, function () {
        debug("expired contact " + contact.flowToken);
        socket.destroy();
        sipApiBackend.sendPushNotification.makeCall(contact.uaEndpoint.ua);
    });
    var oldContact = self.find(function (oldContact) { return sipContact_1.Contact.UaEndpoint.areSame(oldContact.uaEndpoint, contact.uaEndpoint); });
    if (oldContact) {
        debug("uaInstance re-registered, with new contact, overwritten contact: " + oldContact.pretty);
        var oldSocket = self.keyOf(oldContact);
        oldSocket.destroy();
    }
    return trackable_map_1.TrackableMap.prototype.set.call(self, socket, contact);
};
var localIp = "";
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    debug("(re)Staring !");
                    if (!!localIp) return [3 /*break*/, 2];
                    return [4 /*yield*/, new Promise(function (resolve, reject) { return network.get_private_ip(function (err, ip) { return err ? reject(err) : resolve(ip); }); })];
                case 1:
                    localIp = _g.sent();
                    _g.label = 2;
                case 2:
                    _b = (_a = sipLibrary.Socket).bind;
                    _d = (_c = tls).connect;
                    _e = {};
                    _f = "host";
                    return [4 /*yield*/, _constants_1.c.shared.dnsSrv_sips_tcp];
                case 3:
                    backendSocket = new (_b.apply(_a, [void 0, _d.apply(_c, [(_e[_f] = (_g.sent()).name,
                                _e["port"] = _constants_1.c.shared.gatewayPort,
                                _e)])]))();
                    //TODO: see if it really does it's job
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
                        var handledUa, _loop_1, _a, _b, _c, imei, e_1_1, e_1, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    debug("Connection established with backend");
                                    evtNewBackendSocketConnect.post();
                                    handledUa = new Set();
                                    _loop_1 = function (imei) {
                                        sipApiBackend.claimDongle.makeCall(imei).then(function (isGranted) { return __awaiter(_this, void 0, void 0, function () {
                                            var uas, uas_1, uas_1_1, ua, e_2, _a;
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
                                                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                                        finally {
                                                            try {
                                                                if (uas_1_1 && !uas_1_1.done && (_a = uas_1.return)) _a.call(uas_1);
                                                            }
                                                            finally { if (e_2) throw e_2.error; }
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
                                    e_1_1 = _e.sent();
                                    e_1 = { error: e_1_1 };
                                    return [3 /*break*/, 8];
                                case 7:
                                    try {
                                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                    }
                                    finally { if (e_1) throw e_1.error; }
                                    return [7 /*endfinally*/];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); });
                    backendSocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                        var _this = this;
                        var flowToken, asteriskSocket, branch;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    flowToken = sipRequest.headers.via[0].params[_constants_1.c.shared.flowTokenKey];
                                    asteriskSocket = asteriskSockets.get(flowToken);
                                    if (asteriskSocket === undefined) {
                                        asteriskSocket = createAsteriskSocket(flowToken, backendSocket);
                                    }
                                    else if (asteriskSocket === null) {
                                        return [2 /*return*/];
                                    }
                                    debug(("(backend) " + sipRequest.method + " " + flowToken.split("-")[1]).yellow);
                                    if (!!asteriskSocket.evtConnect.postCount) return [3 /*break*/, 2];
                                    return [4 /*yield*/, asteriskSocket.evtConnect.waitFor()];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    if (sipRequest.method === "REGISTER") {
                                        sipRequest.headers["user-agent"] = sipContact_1.PsContact.buildUserAgentFieldValue(sipRequest.headers.contact[0].params["+sip.instance"], sipRequest.headers["user-agent"]);
                                        asteriskSocket.addPathHeader(sipRequest);
                                    }
                                    else {
                                        asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);
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
                                                        fromContact = mapAstSockContact.get(asteriskSocket);
                                                        if (!!fromContact) return [3 /*break*/, 2];
                                                        return [4 /*yield*/, mapAstSockContact.evtSet.waitFor(function (_a) {
                                                                var _b = __read(_a, 2), _ = _b[0], socket = _b[1];
                                                                return socket === asteriskSocket;
                                                            })];
                                                    case 1:
                                                        //TODO: test, should not cause memory leak
                                                        fromContact = (_a.sent())[0];
                                                        _a.label = 2;
                                                    case 2:
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
                        var flowToken = sipResponse.headers.via[0].params[_constants_1.c.shared.flowTokenKey];
                        debug(("(backend): " + sipResponse.status + " " + sipResponse.reason).yellow);
                        var asteriskSocket = asteriskSockets.get(flowToken);
                        if (!asteriskSocket)
                            return;
                        asteriskSocket.rewriteRecordRoute(sipResponse);
                        sipResponse.headers.via.shift();
                        asteriskSocket.write(sipResponse);
                    });
                    backendSocket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b, asteriskSocket, delay, e_3, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    debug("Backend socket closed, waiting and restarting");
                                    try {
                                        for (_a = __values(asteriskSockets.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                            asteriskSocket = _b.value;
                                            if (!asteriskSocket)
                                                continue;
                                            asteriskSocket.destroy();
                                        }
                                    }
                                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                    finally {
                                        try {
                                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                        }
                                        finally { if (e_3) throw e_3.error; }
                                    }
                                    delay = (function getRandomArbitrary(min, max) {
                                        return Math.floor(Math.random() * (max - min) + min);
                                    })(15000, 120000);
                                    debug("Delay before restarting: " + delay + "ms");
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
                                case 1:
                                    _d.sent();
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
function createAsteriskSocket(flowToken, backendSocket) {
    var asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    debug("New asterisk socket flowToken " + flowToken);
    asteriskSockets.set(flowToken, asteriskSocket);
    db.asterisk.getEvtNewContact().attachOncePrepend(function (contact) { return contact.flowToken === flowToken; }, 6000, function (contact) { return mapAstSockContact.set(asteriskSocket, contact); }).catch(function () { return asteriskSocket.destroy(); });
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
        var sdp = sipLibrary.parseSdp(sipPacket.content);
        sipLibrary.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);
        sipPacket.content = sipLibrary.stringifySdp(sdp);
    });
    asteriskSocket.evtRequest.attach(function (sipRequest) {
        if (backendSocket.evtClose.postCount)
            return;
        debug(("(asterisk " + flowToken + ") " + sipRequest.method).cyan);
        var extraParamsFlowToken = {};
        extraParamsFlowToken[_constants_1.c.shared.flowTokenKey] = flowToken;
        var branch = backendSocket.addViaHeader(sipRequest, extraParamsFlowToken);
        backendSocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);
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
        debug(("(asterisk " + flowToken + "): " + sipResponse.status + " " + sipResponse.reason).cyan);
        backendSocket.rewriteRecordRoute(sipResponse, informativeHostname);
        sipResponse.headers.via.shift();
        backendSocket.write(sipResponse);
    });
    return asteriskSocket;
}
