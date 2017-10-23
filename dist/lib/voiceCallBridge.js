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
var agi = require("../tools/agiClient");
var phone = require("../tools/phoneNumberLibrary");
var sipContact_1 = require("./sipContact");
var messageQueue = require("./messageQueue");
var db = require("./db");
var _constants_1 = require("./_constants");
var sipApiBackend = require("./sipApiClientBackend");
var _debug = require("debug");
var debug = _debug("_voiceCall");
function start() {
    var dc = chan_dongle_extended_client_1.DongleController.getInstance();
    var dongleCallContext = dc.moduleConfiguration.defaults.context;
    var scripts = {};
    scripts[_constants_1.c.sipCallContext] = {};
    scripts[_constants_1.c.sipCallContext][_constants_1.c.phoneNumber] = fromSip;
    scripts[dongleCallContext] = {};
    scripts[dongleCallContext][_constants_1.c.phoneNumber] = fromDongle;
    agi.startServer(scripts, dc.ami);
}
exports.start = start;
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
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var _, imei, fromDongle, imsi, iccid, number, endpoint, prDialString, failure, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("Call originated from dongle");
                    _ = channel.relax;
                    return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                case 1:
                    imei = (_d.sent());
                    fromDongle = chan_dongle_extended_client_1.DongleController.getInstance().activeDongles.get(imei);
                    if (!fromDongle)
                        return [2 /*return*/];
                    imsi = fromDongle.sim.imsi;
                    iccid = fromDongle.sim.iccid;
                    number = phone.toNationalNumber(channel.request.callerid, imsi);
                    debug("from number " + number);
                    endpoint = { "dongle": { imei: imei }, "sim": { iccid: iccid } };
                    prDialString = getDialString(endpoint);
                    return [4 /*yield*/, _.setVariable("CALLERID(all)", "\"\" <" + number + ">")];
                case 2:
                    _d.sent();
                    _b = (_a = agi).dialAndGetOutboundChannel;
                    _c = [channel];
                    return [4 /*yield*/, prDialString];
                case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([_d.sent(),
                        function (outboundChannel) { return __awaiter(_this, void 0, void 0, function () {
                            var _;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _ = outboundChannel.relax;
                                        return [4 /*yield*/, _.setVariable("JITTERBUFFER(" + _constants_1.c.jitterBuffer.type + ")", _constants_1.c.jitterBuffer.params)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, _.setVariable("AGC(rx)", _constants_1.c.gain)];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }]))];
                case 4:
                    failure = _d.sent();
                    debug("Call terminated");
                    if (!failure) return [3 /*break*/, 6];
                    //TODO: see if we send missed call if no pick up
                    return [4 /*yield*/, db.semasim.MessageTowardSip.add(number, _constants_1.c.strMissedCall, new Date(), true, {
                            "is": "ALL UA_ENDPOINT OF ENDPOINT",
                            endpoint: endpoint
                        })];
                case 5:
                    //TODO: see if we send missed call if no pick up
                    _d.sent();
                    messageQueue.notifyNewSipMessagesToSend(endpoint);
                    _d.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getDialString(endpoint) {
    var _this = this;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var reachableContacts, evtReachableContact, resolver, timer, timer2, prContacts, contactsCount, contacts, _loop_1, contacts_1, contacts_1_1, contact, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reachableContacts = [];
                    evtReachableContact = new ts_events_extended_1.SyncEvent();
                    db.asterisk.getEvtNewContact().attach(function (_a) {
                        var uaEndpoint = _a.uaEndpoint;
                        return sipContact_1.Contact.UaEndpoint.Endpoint.areSame(uaEndpoint.endpoint, endpoint);
                    }, reachableContacts, function (contact) { return evtReachableContact.post(contact); });
                    resolver = function () {
                        db.asterisk.getEvtNewContact().detach(reachableContacts);
                        //evtReachableContact.detach();
                        clearTimeout(timer);
                        clearTimeout(timer2);
                        var dialString = (function buildDialString(contacts) {
                            var dialStringSplit = [];
                            try {
                                for (var contacts_2 = __values(contacts), contacts_2_1 = contacts_2.next(); !contacts_2_1.done; contacts_2_1 = contacts_2.next()) {
                                    var contact = contacts_2_1.value;
                                    dialStringSplit.push("PJSIP/" + contact.uaEndpoint.endpoint.dongle.imei + "/" + contact.uri);
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (contacts_2_1 && !contacts_2_1.done && (_a = contacts_2.return)) _a.call(contacts_2);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                            return dialStringSplit.join("&");
                            var e_2, _a;
                        })(reachableContacts);
                        debug("Dial string: ", dialString);
                        resolve(dialString);
                    };
                    timer = setTimeout(function () {
                        if (!reachableContacts.length)
                            return;
                        resolver();
                    }, 9000);
                    timer2 = setTimeout(resolver, 45000);
                    prContacts = db.asterisk.getContacts(endpoint);
                    contactsCount = undefined;
                    evtReachableContact.attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (contact) {
                                        reachableContacts.push(contact);
                                    }
                                    if (!(contactsCount === undefined)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, prContacts];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    if (reachableContacts.length >= contactsCount) {
                                        resolver();
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, prContacts];
                case 1:
                    contacts = _b.sent();
                    contactsCount = contacts.length;
                    _loop_1 = function (contact) {
                        sipApiBackend.wakeUpContact.makeCall(contact).then(function (status) {
                            if (status === "REACHABLE") {
                                evtReachableContact.post(contact);
                            }
                            else if (status === "UNREACHABLE") {
                                contactsCount--;
                                evtReachableContact.post(null);
                            }
                        });
                    };
                    try {
                        for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                            contact = contacts_1_1.value;
                            _loop_1(contact);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/];
            }
        });
    }); });
}
