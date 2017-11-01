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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var phone = require("../tools/phoneNumberLibrary");
var sipContact_1 = require("./sipContact");
var messageQueue = require("./messageQueue");
var db = require("./db");
var _constants_1 = require("./_constants");
var sipApiBackend = require("./sipApiClientBackend");
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
        var imei, dongle, _a, imsi, iccid, number, endpoint, evtReachableContact, evtEstablishedOrEnded, ringingChannels, dongleChannelName;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    debug("Call originated from dongle");
                    return [4 /*yield*/, channel.relax.getVariable("DONGLEIMEI")];
                case 1:
                    imei = (_b.sent());
                    dongle = dc.activeDongles.get(imei);
                    if (!dongle)
                        return [2 /*return*/];
                    _a = dongle.sim, imsi = _a.imsi, iccid = _a.iccid;
                    number = phone.toNationalNumber(channel.request.callerid, imsi);
                    endpoint = { "dongle": { imei: imei }, "sim": { iccid: iccid } };
                    evtReachableContact = new ts_events_extended_1.SyncEvent();
                    db.asterisk.getEvtNewContact().attach(function (_a) {
                        var uaEndpoint = _a.uaEndpoint;
                        return sipContact_1.Contact.UaEndpoint.Endpoint.areSame(uaEndpoint.endpoint, endpoint);
                    }, evtReachableContact, function (contact) { return evtReachableContact.post(contact); });
                    db.asterisk.getContacts(endpoint).then(function (contacts) { return contacts.forEach(function (contact) { return sipApiBackend.wakeUpContact.makeCall(contact).then(function (status) { return (status === "REACHABLE") ? evtReachableContact.post(contact) : null; }); }); });
                    evtEstablishedOrEnded = new ts_events_extended_1.VoidSyncEvent();
                    ringingChannels = [];
                    evtEstablishedOrEnded.attachOnce(function () {
                        debug("evtEstablishedOrEnded");
                        evtReachableContact.detach();
                        db.asterisk.getEvtNewContact().detach(evtReachableContact);
                        debug({ ringingChannels: ringingChannels });
                        ringingChannels.forEach(function (channel) { return ami.postAction("hangup", {
                            channel: channel,
                            "cause": "1"
                        }).catch(function () { }); });
                    });
                    dongleChannelName = channel.request.channel;
                    evtReachableContact.attach(function (contact) {
                        debug("Reachable contact!");
                        var sipChannelId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
                        var removeFromRinging;
                        ami.postAction("Originate", {
                            "channel": "PJSIP/" + contact.uaEndpoint.endpoint.dongle.imei + "/" + contact.uri,
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
                    _b.sent();
                    if (!!evtEstablishedOrEnded.postCount) return [3 /*break*/, 4];
                    debug("Dongle channel hanged up but not answered");
                    evtEstablishedOrEnded.post();
                    //TODO: Format date for client country
                    return [4 /*yield*/, db.semasim.MessageTowardSip.add(number, _constants_1.c.strMissedCall, new Date(), true, {
                            "is": "ALL UA_ENDPOINT OF ENDPOINT",
                            endpoint: endpoint
                        })];
                case 3:
                    //TODO: Format date for client country
                    _b.sent();
                    messageQueue.notifyNewSipMessagesToSend(endpoint);
                    _b.label = 4;
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
