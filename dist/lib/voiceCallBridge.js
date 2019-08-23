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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_ami_1 = require("ts-ami");
//import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
var phone_number_1 = require("phone-number");
var dbSemasim = require("./dbSemasim");
var messageDispatcher = require("./messagesDispatcher");
var sip = require("ts-sip");
var logger = require("logger");
var sipContactsMonitor = require("./sipContactsMonitor");
var backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
var debug = logger.debugFactory();
var gain = "3000";
//const volume= "11";
/*
//Work always but introduce delay
const jitterBuffer = {
    "type": "fixed",
    "params": "default"
};
*/
/*
//Ultra long delay, to test
const jitterBuffer = {
    "type": "fixed",
    "params": "2500,10000"
};
*/
/*
//Loss at the beginning of the call from linphone to ast
const jitterBuffer = {
    "type": "adaptive",
    "params": "default"
};
*/
//Work just fine
/*
const jitterBuffer = {
    "type": "adaptive",
    "params": "2000,1600,120"
};
*/
var jitterBuffer = {
    "type": "adaptive",
    "params": "200,1600,10"
};
exports.sipCallContext = "from-sip-call";
var dc;
var ami;
function initAgi() {
    var _a;
    ami = ts_ami_1.Ami.getInstance();
    dc = chan_dongle_extended_client_1.DongleController.getInstance();
    var dongleCallContext = dc.staticModuleConfiguration.defaults["context"];
    ami.startAgi((_a = {},
        _a[exports.sipCallContext] = { "_[+0-9].": fromSip },
        _a[dongleCallContext] = { "_[+0-9].": fromDongle },
        _a), undefined, function (severity, message, error) {
        if (severity === "WARNING") {
            debug(message, error);
        }
        else {
            debug(severity, message);
            throw error;
        }
    });
}
exports.initAgi = initAgi;
var ongoingCalls = new Set();
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, dongle, number, evtReachableContact, _loop_1, _a, _b, contact, channels, evtAnsweredOrEnded, dongleChannelName, resolvePrBridgeCall, ongoingCall;
        var e_1, _c;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("Call originated from dongle");
                    return [4 /*yield*/, channel.relax.getVariable("DONGLEIMSI")];
                case 1:
                    imsi = (_d.sent());
                    dongle = Array.from(dc.usableDongles.values()).find(function (_a) {
                        var sim = _a.sim;
                        return sim.imsi === imsi;
                    });
                    if (!dongle) {
                        return [2 /*return*/];
                    }
                    number = phone_number_1.phoneNumber.build(channel.request.callerid, !!dongle.sim.country ? dongle.sim.country.iso : undefined);
                    evtReachableContact = new ts_events_extended_1.SyncEvent();
                    sipContactsMonitor.evtContactRegistration.attach(function (_a) {
                        var uaSim = _a.uaSim;
                        return uaSim.imsi === imsi;
                    }, evtReachableContact, function (contact) { return evtReachableContact.post(contact); });
                    _loop_1 = function (contact) {
                        backendRemoteApiCaller
                            .wakeUpContact(contact)
                            .then(function (status) {
                            if (status === "REACHABLE") {
                                evtReachableContact.post(contact);
                            }
                        });
                    };
                    try {
                        for (_a = __values(sipContactsMonitor.getContacts(imsi)), _b = _a.next(); !_b.done; _b = _a.next()) {
                            contact = _b.value;
                            _loop_1(contact);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    channels = new Map();
                    evtAnsweredOrEnded = new ts_events_extended_1.VoidSyncEvent();
                    evtAnsweredOrEnded.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _a, answeredByContact;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    debug("evtEstablishedOrEnded");
                                    evtReachableContact.detach();
                                    sipContactsMonitor.evtContactRegistration.detach(evtReachableContact);
                                    Array.from(channels.values())
                                        .filter(function (_a) {
                                        var state = _a.state;
                                        return state === "RINGING";
                                    })
                                        .forEach(function (_a) {
                                        var channelName = _a.channelName;
                                        return ami.postAction("hangup", {
                                            "channel": channelName,
                                            "cause": "1"
                                        }).catch(function () { });
                                    });
                                    _a = __read(Array.from(channels)
                                        .filter(function (_a) {
                                        var _b = __read(_a, 2), _ = _b[0], state = _b[1].state;
                                        return state === "ANSWERED";
                                    })
                                        .map(function (_a) {
                                        var _b = __read(_a, 1), contact = _b[0];
                                        return contact;
                                    }), 1), answeredByContact = _a[0];
                                    if (!!!answeredByContact) return [3 /*break*/, 2];
                                    return [4 /*yield*/, dbSemasim.onCallAnswered(number, imsi, answeredByContact.uaSim.ua, Array.from(channels.keys())
                                            .filter(function (_contact) { return _contact !== answeredByContact; })
                                            .map(function (contact) { return contact.uaSim.ua; }))];
                                case 1:
                                    _b.sent();
                                    return [3 /*break*/, 4];
                                case 2:
                                    debug("Dongle channel hanged up but not answered");
                                    return [4 /*yield*/, dbSemasim.onMissedCall(imsi, number)];
                                case 3:
                                    _b.sent();
                                    _b.label = 4;
                                case 4:
                                    messageDispatcher.notifyNewSipMessagesToSend(imsi);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    dongleChannelName = channel.request.channel;
                    ongoingCall = {
                        imsi: imsi,
                        number: number,
                        "channelName": dongleChannelName,
                        "userEmails": new Set(),
                        "prBridgeCall": new Promise(function (resolve) { return resolvePrBridgeCall = resolve; })
                    };
                    ongoingCalls.add(ongoingCall);
                    evtReachableContact.attach(function (contact) {
                        debug("Reachable contact!");
                        var sipChannelId = ts_ami_1.Ami.generateUniqueActionId();
                        ami.postAction("Originate", {
                            "channel": [
                                "PJSIP",
                                sip.parseUri(contact.uri).user,
                                contact.uri
                            ].join("/"),
                            "application": "Bridge",
                            "data": dongleChannelName,
                            "callerid": "\"\" <" + number + ">",
                            "channelid": sipChannelId
                        }).then(function () {
                            debug("Answered");
                            channels.get(contact).state = "ANSWERED";
                            ongoingCall.userEmails.add(contact.uaSim.ua.userEmail);
                            ami.evt.attachOnce(function (_a) {
                                var event = _a.event, uniqueid = _a.uniqueid;
                                return (event === "Hangup" &&
                                    uniqueid === sipChannelId);
                            }, function () { return ongoingCall.userEmails.delete(contact.uaSim.ua.userEmail); });
                            evtAnsweredOrEnded.post();
                        }).catch(function () {
                            return channels.get(contact).state = "REJECTED";
                        });
                        ami.evt.attachOnce(function (_a) {
                            var event = _a.event, uniqueid = _a.uniqueid;
                            return (event === "Newchannel" &&
                                uniqueid === sipChannelId);
                        }, function (data) {
                            var channelName = data.channel;
                            debug("New sip channel: ", channelName);
                            channels.set(contact, { channelName: channelName, "state": "RINGING" });
                            ami.setVar("AGC(rx)", gain, channelName);
                            ami.setVar("JITTERBUFFER(" + jitterBuffer.type + ")", jitterBuffer.params, channelName);
                            //To automatically increase the volume toward the softphone.
                            //ami.setVar("VOLUME(TX)", volume, channelName);
                            ami.setVar("AGC(tx)", "32768", channelName);
                        });
                    });
                    ami.evt.attachOnce(function (e) { return (e.event === "BridgeEnter" &&
                        e["channel"] === dongleChannelName); }, channel, function () { return resolvePrBridgeCall(); });
                    return [4 /*yield*/, ami.evt.waitFor(function (_a) {
                            var event = _a.event, channel = _a.channel;
                            return (event === "Hangup" &&
                                channel === dongleChannelName);
                        })];
                case 2:
                    _d.sent();
                    ami.evt.detach(channel);
                    ongoingCalls.delete(ongoingCall);
                    /** no problem we can emit as long as we attach once */
                    evtAnsweredOrEnded.post();
                    debug("Call ended");
                    return [2 /*return*/];
            }
        });
    });
}
function fromSip(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _, setGainControlAndJitterBuffer, contact, call_id, number, dongle, ongoingCall, resolvePrBridgeCall, callPlacedAtDateTime_1, callRingingAfterMs_1, callAnsweredAfterMs_1, sendNotification_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _ = channel.relax;
                    setGainControlAndJitterBuffer = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, _.setVariable("JITTERBUFFER(" + jitterBuffer.type + ")", jitterBuffer.params)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, _.setVariable("AGC(rx)", gain)];
                                case 2:
                                    _a.sent();
                                    //To automatically increase the volume toward the softphone.
                                    //await _.setVariable("VOLUME(TX)",volume);
                                    return [4 /*yield*/, _.setVariable("AGC(tx)", "32768")];
                                case 3:
                                    //To automatically increase the volume toward the softphone.
                                    //await _.setVariable("VOLUME(TX)",volume);
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    debug("Call originated from sip");
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var contact_uri;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, _.getVariable("CHANNEL(pjsip,target_uri)")];
                                    case 1:
                                        contact_uri = _a.sent();
                                        return [2 /*return*/, sipContactsMonitor.getContacts()
                                                .find(function (_a) {
                                                var uri = _a.uri;
                                                return uri === contact_uri;
                                            })];
                                }
                            });
                        }); })()];
                case 1:
                    contact = _a.sent();
                    return [4 /*yield*/, _.getVariable("CHANNEL(pjsip,call-id)")];
                case 2:
                    call_id = (_a.sent());
                    number = channel.request.extension;
                    dongle = Array.from(chan_dongle_extended_client_1.DongleController.getInstance().usableDongles.values())
                        .find(function (_a) {
                        var sim = _a.sim;
                        return sim.imsi === contact.uaSim.imsi;
                    });
                    if (!dongle) {
                        //TODO: Improve
                        debug("DONGLE is not usable");
                        return [2 /*return*/];
                    }
                    ongoingCall = Array.from(ongoingCalls)
                        .find(function (_a) {
                        var imsi = _a.imsi;
                        return imsi === contact.uaSim.imsi;
                    });
                    debug({ ongoingCall: ongoingCall });
                    if (!(ongoingCall !== undefined)) return [3 /*break*/, 12];
                    if (!(ongoingCall.number !== number)) return [3 /*break*/, 4];
                    debug("Dongle already in a call with an other number (" + ongoingCall.number + ")");
                    return [4 /*yield*/, _.hangup()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
                case 4:
                    if (!(ongoingCall.userEmails.size === 0)) return [3 /*break*/, 6];
                    debug("The user phone is about to ring");
                    return [4 /*yield*/, _.hangup()];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
                case 6:
                    if (!ongoingCall.userEmails.has(contact.uaSim.ua.userEmail)) return [3 /*break*/, 8];
                    debug("User is already calling with an other device!");
                    return [4 /*yield*/, _.hangup()];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
                case 8: return [4 /*yield*/, setGainControlAndJitterBuffer()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, ongoingCall.prBridgeCall];
                case 10:
                    _a.sent();
                    ongoingCall.userEmails.add(contact.uaSim.ua.userEmail);
                    return [4 /*yield*/, _.exec("BridgeAdd", [ongoingCall.channelName])];
                case 11:
                    _a.sent();
                    ongoingCall.userEmails.delete(contact.uaSim.ua.userEmail);
                    return [2 /*return*/];
                case 12:
                    ongoingCall = {
                        "imsi": contact.uaSim.imsi,
                        number: number,
                        "channelName": channel.request.channel,
                        "userEmails": new Set([contact.uaSim.ua.userEmail]),
                        "prBridgeCall": new Promise(function (resolve) { return resolvePrBridgeCall = resolve; })
                    };
                    ami.evt.attachOnce(function (e) { return (e.event === "BridgeEnter" &&
                        e["channel"] === channel.request.channel); }, channel, function () { return resolvePrBridgeCall(); });
                    ami.evt.attachOnce(function (e) { return (e.event === "Hangup" &&
                        e["channel"] === channel.request.channel); }, function () {
                        ami.evt.detach(channel);
                        ongoingCall.userEmails.delete(contact.uaSim.ua.userEmail);
                    });
                    ami.evt.attachOnce(function (_a) {
                        var event = _a.event, linkedid = _a.linkedid;
                        return (event === "Newchannel" &&
                            linkedid === channel.request.uniqueid);
                    }, channel, function (_a) {
                        var dongleChannelName = _a.channel;
                        ongoingCalls.add(ongoingCall);
                        ami.evt.attachOnce(function (e) { return (e.event === "Hangup" &&
                            e["channel"] === dongleChannelName); }, function () { return ongoingCalls.delete(ongoingCall); });
                    });
                    {
                        callPlacedAtDateTime_1 = Date.now();
                        callRingingAfterMs_1 = undefined;
                        callAnsweredAfterMs_1 = undefined;
                        sendNotification_1 = function () { return dbSemasim.onCallFromSipTerminated(number, contact.uaSim.imsi, callPlacedAtDateTime_1, callRingingAfterMs_1, callAnsweredAfterMs_1, Date.now() - callPlacedAtDateTime_1, contact.uaSim.ua).then(function () { return messageDispatcher.notifyNewSipMessagesToSend(contact.uaSim.imsi); }); };
                        ami.evt.attachOnce(function (e) { return (e["event"] === "RTCPSent" &&
                            e["channelstatedesc"] === "Ring" &&
                            e["channel"] === channel.request.channel); }, channel, function () {
                            callRingingAfterMs_1 = Date.now() - callPlacedAtDateTime_1;
                            dbSemasim.onTargetGsmRinging(contact, number, call_id)
                                .then(function () { return messageDispatcher.sendMessagesOfContact(contact); });
                        });
                        ami.evt.attachOnce(function (e) { return (e["event"] === "BridgeEnter" &&
                            e["channel"] !== channel.request.channel &&
                            e["linkedid"] === channel.request.uniqueid); }, channel, function (_a) {
                            var dongleChannelName = _a.channel;
                            if (callRingingAfterMs_1 === undefined) {
                                callRingingAfterMs_1 = Date.now();
                            }
                            callAnsweredAfterMs_1 = Date.now() - callPlacedAtDateTime_1;
                            ami.evt.attachOnce(function (e) { return (e["event"] === "Hangup" &&
                                e["channel"] === dongleChannelName); }, function () { return sendNotification_1(); });
                        });
                        ami.evt.attachOnce(function (e) { return (e["channel"] === channel.request.channel &&
                            e["event"] === "Hangup"); }, function () {
                            if (callAnsweredAfterMs_1 !== undefined) {
                                return;
                            }
                            sendNotification_1();
                        });
                    }
                    return [4 /*yield*/, setGainControlAndJitterBuffer()];
                case 13:
                    _a.sent();
                    //TODO: Dial with guessed from ( and only dial, even if not very important)
                    //TODO: there is a delay for call terminated when web client abruptly disconnect.
                    return [4 /*yield*/, _.exec("Dial", ["Dongle/i:" + dongle.imei + "/" + number])];
                case 14:
                    //TODO: Dial with guessed from ( and only dial, even if not very important)
                    //TODO: there is a delay for call terminated when web client abruptly disconnect.
                    _a.sent();
                    //TODO: Increase volume on TX
                    debug("call terminated");
                    return [2 /*return*/];
            }
        });
    });
}
