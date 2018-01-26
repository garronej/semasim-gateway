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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var messageQueue = require("./messageQueue");
var db = require("./db");
var _constants_1 = require("./_constants");
var sipApiBackend = require("./sipApiBackedClientImplementation");
var sipProxy = require("./sipProxy");
var _debug = require("debug");
var debug = _debug("_voiceCallBridge");
var dc;
var ami;
function start() {
    dc = chan_dongle_extended_client_1.DongleController.getInstance();
    ami = dc.ami;
    var dongleCallContext = dc.moduleConfiguration.defaults.context;
    var scripts = {};
    scripts[_constants_1.c.sipCallContext] = {};
    scripts[_constants_1.c.sipCallContext]["_[+0-9]."] = fromSip;
    scripts[dongleCallContext] = {};
    scripts[dongleCallContext]["_[+0-9]."] = fromDongle;
    dc.ami.startAgi(scripts);
}
exports.start = start;
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, dongle, number, evtReachableContact, _loop_1, _a, _b, contact, evtEstablishedOrEnded, ringingChannels, dongleChannelName, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("Call originated from dongle");
                    return [4 /*yield*/, channel.relax.getVariable("DONGLEIMSI")];
                case 1:
                    imsi = (_d.sent());
                    dongle = Array.from(dc.activeDongles.values()).find(function (_a) {
                        var sim = _a.sim;
                        return sim.imsi === imsi;
                    });
                    if (!dongle)
                        return [2 /*return*/];
                    number = chan_dongle_extended_client_1.utils.toNationalNumber(channel.request.callerid, imsi);
                    evtReachableContact = new ts_events_extended_1.SyncEvent();
                    //TODO: finish
                    db.asterisk.evtNewContact.attach(function (_a) {
                        var uaSim = _a.uaSim;
                        return uaSim.imsi === imsi;
                    }, evtReachableContact, function (contact) { return evtReachableContact.post(contact); });
                    _loop_1 = function (contact) {
                        sipApiBackend.wakeUpContact(contact).then(function (status) {
                            if (status === "REACHABLE") {
                                evtReachableContact.post(contact);
                            }
                        });
                    };
                    try {
                        for (_a = __values(sipProxy.getContacts(imsi)), _b = _a.next(); !_b.done; _b = _a.next()) {
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
                    evtEstablishedOrEnded = new ts_events_extended_1.VoidSyncEvent();
                    ringingChannels = [];
                    evtEstablishedOrEnded.attachOnce(function () {
                        debug("evtEstablishedOrEnded");
                        evtReachableContact.detach();
                        db.asterisk.evtNewContact.detach(evtReachableContact);
                        debug({ ringingChannels: ringingChannels });
                        try {
                            for (var ringingChannels_1 = __values(ringingChannels), ringingChannels_1_1 = ringingChannels_1.next(); !ringingChannels_1_1.done; ringingChannels_1_1 = ringingChannels_1.next()) {
                                var ringingChannel = ringingChannels_1_1.value;
                                ami.postAction("hangup", {
                                    "channel": ringingChannel,
                                    "cause": "1"
                                }).catch(function () { });
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (ringingChannels_1_1 && !ringingChannels_1_1.done && (_a = ringingChannels_1.return)) _a.call(ringingChannels_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        var e_2, _a;
                    });
                    dongleChannelName = channel.request.channel;
                    evtReachableContact.attach(function (contact) {
                        debug("Reachable contact!");
                        var sipChannelId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
                        var removeFromRinging;
                        ami.postAction("Originate", {
                            "channel": "PJSIP/" + contact.uaSim.imsi + "/" + contact.uri,
                            "application": "Bridge",
                            "data": dongleChannelName,
                            "callerid": "\"\" <" + number + ">",
                            "channelid": sipChannelId
                        }).then(function () {
                            debug("Answered");
                            removeFromRinging();
                            evtEstablishedOrEnded.post();
                        }).catch(function (error) {
                            removeFromRinging();
                        });
                        ami.evt.attachOnce(function (_a) {
                            var event = _a.event, uniqueid = _a.uniqueid;
                            return (event === "Newchannel" &&
                                uniqueid === sipChannelId);
                        }, function (data) {
                            var sipChannelName = data.channel;
                            debug("New sip channel: ", sipChannelName);
                            ringingChannels.push(sipChannelName);
                            removeFromRinging = function () { return ringingChannels.splice(ringingChannels.indexOf(sipChannelName), 1); };
                            ami.setVar("AGC(rx)", _constants_1.c.gain, sipChannelName);
                            ami.setVar("JITTERBUFFER(" + _constants_1.c.jitterBuffer.type + ")", _constants_1.c.jitterBuffer.params, sipChannelName);
                        });
                    });
                    return [4 /*yield*/, ami.evt.waitFor(function (_a) {
                            var event = _a.event, channel = _a.channel;
                            return (event === "Hangup" &&
                                channel === dongleChannelName);
                        })];
                case 2:
                    _d.sent();
                    if (!!evtEstablishedOrEnded.postCount) return [3 /*break*/, 4];
                    debug("Dongle channel hanged up but not answered");
                    evtEstablishedOrEnded.post();
                    //TODO: Format date for client country
                    return [4 /*yield*/, db.semasim.MessageTowardSip.add(number, "Missed call", new Date(), true, {
                            "target": "ALL UA REGISTERED TO SIM",
                            "imsi": imsi
                        })];
                case 3:
                    //TODO: Format date for client country
                    _d.sent();
                    messageQueue.notifyNewSipMessagesToSend(imsi);
                    _d.label = 4;
                case 4:
                    debug("Call ended");
                    return [2 /*return*/];
            }
        });
    });
}
function fromSip(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _, imei;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _ = channel.relax;
                    debug("Call originated from sip");
                    imei = channel.request.callerid;
                    return [4 /*yield*/, _.setVariable("JITTERBUFFER(" + _constants_1.c.jitterBuffer.type + ")", _constants_1.c.jitterBuffer.params)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, _.setVariable("AGC(rx)", _constants_1.c.gain)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, _.exec("Dial", ["Dongle/i:" + imei + "/" + channel.request.extension])];
                case 3:
                    _a.sent();
                    //TODO: Increase volume on TX
                    debug("call terminated");
                    return [2 /*return*/];
            }
        });
    });
}
