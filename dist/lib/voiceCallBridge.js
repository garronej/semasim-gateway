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
var gain = "" + 4000;
var jitterBuffer = {
    "type": "adaptive",
    "params": "default"
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
        _a));
}
exports.initAgi = initAgi;
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1, _a, imsi, dongle, number, evtReachableContact, _loop_1, _b, _c, contact, ringingChannels, evtEstablishedOrEnded, dongleChannelName;
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
                        for (_b = __values(sipContactsMonitor.getContacts(imsi)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            contact = _c.value;
                            _loop_1(contact);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    ringingChannels = new Map();
                    evtEstablishedOrEnded = new ts_events_extended_1.SyncEvent();
                    evtEstablishedOrEnded.attachOnce(function (contact) { return __awaiter(_this, void 0, void 0, function () {
                        var e_2, _a, _b, _c, channelName, ringingUas;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    debug("evtEstablishedOrEnded");
                                    evtReachableContact.detach();
                                    sipContactsMonitor.evtContactRegistration.detach(evtReachableContact);
                                    try {
                                        for (_b = __values(ringingChannels.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                            channelName = _c.value;
                                            ami.postAction("hangup", {
                                                "channel": channelName,
                                                "cause": "1"
                                            }).catch(function () { });
                                        }
                                    }
                                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                    finally {
                                        try {
                                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                    }
                                    if (!!!contact) return [3 /*break*/, 2];
                                    ringingUas = Array.from(ringingChannels.keys())
                                        .map(function (contact) { return contact.uaSim.ua; });
                                    return [4 /*yield*/, dbSemasim.onCallAnswered(number, imsi, contact.uaSim.ua, ringingUas)];
                                case 1:
                                    _d.sent();
                                    return [3 /*break*/, 4];
                                case 2:
                                    debug("Dongle channel hanged up but not answered");
                                    return [4 /*yield*/, dbSemasim.onMissedCall(imsi, number)];
                                case 3:
                                    _d.sent();
                                    _d.label = 4;
                                case 4:
                                    messageDispatcher.notifyNewSipMessagesToSend(imsi);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    dongleChannelName = channel.request.channel;
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
                            ringingChannels.delete(contact);
                            evtEstablishedOrEnded.post(contact);
                        }).catch(function () { return ringingChannels.delete(contact); });
                        ami.evt.attachOnce(function (_a) {
                            var event = _a.event, uniqueid = _a.uniqueid;
                            return (event === "Newchannel" &&
                                uniqueid === sipChannelId);
                        }, function (data) {
                            var sipChannelName = data.channel;
                            debug("New sip channel: ", sipChannelName);
                            ringingChannels.set(contact, sipChannelName);
                            ami.setVar("AGC(rx)", gain, sipChannelName);
                            ami.setVar("JITTERBUFFER(" + jitterBuffer.type + ")", jitterBuffer.params, sipChannelName);
                        });
                    });
                    return [4 /*yield*/, ami.evt.waitFor(function (_a) {
                            var event = _a.event, channel = _a.channel;
                            return (event === "Hangup" &&
                                channel === dongleChannelName);
                        })];
                case 2:
                    _d.sent();
                    /** no problem we can emit as long as we attach once */
                    evtEstablishedOrEnded.post(undefined);
                    debug("Call ended");
                    return [2 /*return*/];
            }
        });
    });
}
function fromSip(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _, contact_uri, call_id, contact, dongle, number;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _ = channel.relax;
                    debug("Call originated from sip");
                    return [4 /*yield*/, _.getVariable("CHANNEL(pjsip,target_uri)")];
                case 1:
                    contact_uri = _a.sent();
                    return [4 /*yield*/, _.getVariable("CHANNEL(pjsip,call-id)")];
                case 2:
                    call_id = (_a.sent());
                    contact = sipContactsMonitor.getContacts()
                        .find(function (_a) {
                        var uri = _a.uri;
                        return uri === contact_uri;
                    });
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
                    number = channel.request.extension;
                    ami.evt.waitFor(function (e) { return (e["event"] === "RTCPSent" &&
                        e["channelstatedesc"] === "Ring" &&
                        e["channel"] === channel.request.channel); }, 30000)
                        .then(function () { return dbSemasim.onTargetGsmRinging(contact, number, call_id)
                        .then(function () { return messageDispatcher.sendMessagesOfContact(contact); }); })
                        .catch(function () { });
                    return [4 /*yield*/, _.setVariable("JITTERBUFFER(" + jitterBuffer.type + ")", jitterBuffer.params)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, _.setVariable("AGC(rx)", gain)];
                case 4:
                    _a.sent();
                    //TODO: Dial with guessed from ( and only dial, even if not very important)
                    //TODO: there is a delay for call terminated when web client abruptly disconnect.
                    return [4 /*yield*/, _.exec("Dial", ["Dongle/i:" + dongle.imei + "/" + number])];
                case 5:
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
