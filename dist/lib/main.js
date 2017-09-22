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
require("rejection-tracker").main(__dirname, "..", "..");
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var agi = require("../tools/agiClient");
var sipContact_1 = require("./sipContact");
var sipApiBackend = require("./sipApiClientBackend");
var db = require("./db");
var sipProxy = require("./sipProxy");
var sipMessage = require("./sipMessage");
var phone = require("../tools/phoneNumberLibrary");
var AsyncLock = require("async-lock");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_main");
var dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
debug("Starting semasim gateway !");
(function callee() {
    return __awaiter(this, void 0, void 0, function () {
        var defaults, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, dongleClient.getConfig()];
                case 1:
                    defaults = (_a.sent()).defaults;
                    start(defaults.context);
                    return [3 /*break*/, 4];
                case 2:
                    error_1 = _a.sent();
                    debug("dongle extended not initialized yet, scheduling retry...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 3:
                    _a.sent();
                    callee();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
})();
function start(dongleCallContext) {
    var _this = this;
    debug("Dongle extended initialized!");
    var scripts = {};
    scripts[_constants_1.c.sipCallContext] = {};
    scripts[_constants_1.c.sipCallContext][_constants_1.c.phoneNumber] = function (channel) { return __awaiter(_this, void 0, void 0, function () {
        var _, imei;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _ = channel.relax;
                    debug("FROM SIP CALL!");
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
    }); };
    scripts[dongleCallContext] = {};
    scripts[dongleCallContext][_constants_1.c.phoneNumber] = function (channel) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var _, number, imei, wakeUpAllContactsPromise, imsi, dialString, failure;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _ = channel.relax;
                    number = channel.request.callerid;
                    debug("Call from " + number + " !");
                    return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                case 1:
                    imei = (_a.sent());
                    wakeUpAllContactsPromise = sipContact_1.contactIo.wakeUpAllContacts(imei, 9000);
                    return [4 /*yield*/, _.getVariable("DONGLEIMSI")];
                case 2:
                    imsi = (_a.sent());
                    return [4 /*yield*/, _.setVariable("CALLERID(all)", "\"\" <" + phone.toNationalNumber(number, imsi) + ">")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, wakeUpAllContactsPromise];
                case 4:
                    dialString = (_a.sent())
                        .reachableContacts
                        .map(function (_a) {
                        var uri = _a.uri;
                        return "PJSIP/" + imei + "/" + uri;
                    }).join("&");
                    if (!dialString) {
                        //TODO send missed call to all contacts!
                        debug("No contact to dial!");
                        return [2 /*return*/];
                    }
                    debug("Dialing...");
                    debug({ dialString: dialString });
                    return [4 /*yield*/, agi.dialAndGetOutboundChannel(channel, dialString, function (outboundChannel) { return __awaiter(_this, void 0, void 0, function () {
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
                        }); })];
                case 5:
                    failure = _a.sent();
                    if (!failure) return [3 /*break*/, 7];
                    return [4 /*yield*/, db.semasim.addMessageTowardSip(number, _constants_1.c.strMissedCall, new Date(), { "allUaInstanceOfImei": imei })];
                case 6:
                    _a.sent();
                    notifyNewSipMessagesToSend();
                    return [3 /*break*/, 8];
                case 7:
                    debug("...Call ended");
                    _a.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    }); };
    agi.startServer(scripts);
    function onNewActiveDongle(dongle) {
        return __awaiter(this, void 0, void 0, function () {
            var password;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("onNewActiveDongle", dongle);
                        return [4 /*yield*/, db.semasim.addDongleAndSim(dongle.imei, dongle.iccid)];
                    case 1:
                        _a.sent();
                        password = dongle.iccid.substring(dongle.iccid.length - 4);
                        return [4 /*yield*/, db.asterisk.addOrUpdateEndpoint(dongle.imei, password)];
                    case 2:
                        _a.sent();
                        sendDonglePendingMessages(dongle.imei);
                        return [2 /*return*/];
                }
            });
        });
    }
    (function findActiveDongleAndStartSipProxy() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, activeDongle, e_1_1, e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 6, 7, 8]);
                        return [4 /*yield*/, dongleClient.getActiveDongles()];
                    case 1:
                        _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                        _d.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 5];
                        activeDongle = _b.value;
                        return [4 /*yield*/, onNewActiveDongle(activeDongle)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 8:
                        sipProxy.start();
                        return [2 /*return*/];
                }
            });
        });
    })();
    dongleClient.evtDongleConnect.attach(function (imei) { return __awaiter(_this, void 0, void 0, function () {
        var activeDongle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("dongle connect!");
                    return [4 /*yield*/, dongleClient.getActiveDongle(imei)];
                case 1:
                    activeDongle = _a.sent();
                    if (!activeDongle) return [3 /*break*/, 3];
                    return [4 /*yield*/, onNewActiveDongle(activeDongle)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    sipApiBackend.claimDongle.makeCall(imei);
                    return [2 /*return*/];
            }
        });
    }); });
    dongleClient.evtActiveDongleDisconnect.attach(function (dongle) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            debug("onDongleDisconnect", dongle);
            return [2 /*return*/];
        });
    }); });
    sipContact_1.contactIo.getEvtNewContact().attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var isNew;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    //debug("New contact", Contact.pretty(contact));
                    debug("New contact", sipContact_1.Contact.readInstanceId(contact));
                    return [4 /*yield*/, db.semasim.addUaInstance(sipContact_1.Contact.buildUaInstancePk(contact))];
                case 1:
                    isNew = _a.sent();
                    if (isNew) {
                        debug("TODO: it's a new UA, send initialization messages");
                    }
                    sendPendingSipMessagesToReachableContact(contact);
                    return [2 /*return*/];
            }
        });
    }); });
    sipContact_1.contactIo.getEvtExpiredContact().attach(function (contactUri) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            debug("Expired contact: ", contactUri);
            sipApiBackend.wakeUpUserAgent.makeCall(contactUri);
            return [2 /*return*/];
        });
    }); });
    sipMessage.startAccepting();
    var lock1 = new AsyncLock();
    function sendDonglePendingMessages(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, lock1.acquire(imei, function () { return __awaiter(_this, void 0, void 0, function () {
                            var _this = this;
                            var messages, messByNum, messages_1, messages_1_1, message, to_number, tasks, _loop_1, _a, _b, messages_2, e_2, _c, e_3, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, db.semasim.getUnsentMessageOfDongleSim(imei)];
                                    case 1:
                                        messages = _e.sent();
                                        messByNum = new Map();
                                        try {
                                            for (messages_1 = __values(messages), messages_1_1 = messages_1.next(); !messages_1_1.done; messages_1_1 = messages_1.next()) {
                                                message = messages_1_1.value;
                                                to_number = message.to_number;
                                                if (!messByNum.has(to_number))
                                                    messByNum.set(to_number, []);
                                                messByNum.get(to_number).push(message);
                                            }
                                        }
                                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                        finally {
                                            try {
                                                if (messages_1_1 && !messages_1_1.done && (_c = messages_1.return)) _c.call(messages_1);
                                            }
                                            finally { if (e_2) throw e_2.error; }
                                        }
                                        tasks = [];
                                        _loop_1 = function (messages_2) {
                                            tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                                                var messages_3, messages_3_1, message, id, sender, to_number, text, sentMessageId, error_2, e_4_1, e_4, _a;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            _b.trys.push([0, 13, 14, 15]);
                                                            messages_3 = __values(messages_2), messages_3_1 = messages_3.next();
                                                            _b.label = 1;
                                                        case 1:
                                                            if (!!messages_3_1.done) return [3 /*break*/, 12];
                                                            message = messages_3_1.value;
                                                            id = message.id, sender = message.sender, to_number = message.to_number, text = message.text;
                                                            sentMessageId = void 0;
                                                            _b.label = 2;
                                                        case 2:
                                                            _b.trys.push([2, 4, , 5]);
                                                            return [4 /*yield*/, dongleClient.sendMessage(imei, to_number, text)];
                                                        case 3:
                                                            sentMessageId = _b.sent();
                                                            return [3 /*break*/, 5];
                                                        case 4:
                                                            error_2 = _b.sent();
                                                            if (error_2.message !== chan_dongle_extended_client_1.typesDef.errorMessages.messageNotSent)
                                                                return [2 /*return*/];
                                                            sentMessageId = 0;
                                                            return [3 /*break*/, 5];
                                                        case 5: return [4 /*yield*/, db.semasim.setMessageToGsmSentId(id, sentMessageId)];
                                                        case 6:
                                                            _b.sent();
                                                            if (!sentMessageId) return [3 /*break*/, 8];
                                                            return [4 /*yield*/, db.semasim.addMessageTowardSip(to_number, "---Message send, sentMessageId: " + sentMessageId + "---", new Date(), { "uaInstance": sender })];
                                                        case 7:
                                                            _b.sent();
                                                            return [3 /*break*/, 10];
                                                        case 8: return [4 /*yield*/, db.semasim.addMessageTowardSip(to_number, "Error message not sent", new Date(), { "uaInstance": sender })];
                                                        case 9:
                                                            _b.sent();
                                                            _b.label = 10;
                                                        case 10:
                                                            notifyNewSipMessagesToSend();
                                                            _b.label = 11;
                                                        case 11:
                                                            messages_3_1 = messages_3.next();
                                                            return [3 /*break*/, 1];
                                                        case 12: return [3 /*break*/, 15];
                                                        case 13:
                                                            e_4_1 = _b.sent();
                                                            e_4 = { error: e_4_1 };
                                                            return [3 /*break*/, 15];
                                                        case 14:
                                                            try {
                                                                if (messages_3_1 && !messages_3_1.done && (_a = messages_3.return)) _a.call(messages_3);
                                                            }
                                                            finally { if (e_4) throw e_4.error; }
                                                            return [7 /*endfinally*/];
                                                        case 15: return [2 /*return*/];
                                                    }
                                                });
                                            }); })();
                                        };
                                        try {
                                            for (_a = __values(messByNum.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                                messages_2 = _b.value;
                                                _loop_1(messages_2);
                                            }
                                        }
                                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                        finally {
                                            try {
                                                if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                            }
                                            finally { if (e_3) throw e_3.error; }
                                        }
                                        return [4 /*yield*/, Promise.all(tasks)];
                                    case 2:
                                        _e.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    var lock2 = new AsyncLock();
    function sendPendingSipMessagesToReachableContact(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var contactPk;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contactPk = sipContact_1.Contact.buildUaInstancePk(contact);
                        return [4 /*yield*/, lock2.acquire(JSON.stringify(contactPk), function () { return __awaiter(_this, void 0, void 0, function () {
                                var messages, messages_4, messages_4_1, message, received, error_3, e_5_1, e_5, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, db.semasim.getUndeliveredMessagesOfUaInstance(contactPk)];
                                        case 1:
                                            messages = _b.sent();
                                            _b.label = 2;
                                        case 2:
                                            _b.trys.push([2, 11, 12, 13]);
                                            messages_4 = __values(messages), messages_4_1 = messages_4.next();
                                            _b.label = 3;
                                        case 3:
                                            if (!!messages_4_1.done) return [3 /*break*/, 10];
                                            message = messages_4_1.value;
                                            debug("Sending: " + JSON.stringify(message.text) + " from " + message.from_number);
                                            received = void 0;
                                            _b.label = 4;
                                        case 4:
                                            _b.trys.push([4, 6, , 7]);
                                            return [4 /*yield*/, sipMessage.sendMessage(contact, message.from_number, {}, message.text)];
                                        case 5:
                                            received = _b.sent();
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_3 = _b.sent();
                                            debug("error:", error_3.message);
                                            return [3 /*break*/, 10];
                                        case 7:
                                            if (!received) {
                                                debug("Not, received, break!");
                                                return [3 /*break*/, 10];
                                            }
                                            return [4 /*yield*/, db.semasim.setMessageTowardSipDelivered(contactPk, message.id)];
                                        case 8:
                                            _b.sent();
                                            _b.label = 9;
                                        case 9:
                                            messages_4_1 = messages_4.next();
                                            return [3 /*break*/, 3];
                                        case 10: return [3 /*break*/, 13];
                                        case 11:
                                            e_5_1 = _b.sent();
                                            e_5 = { error: e_5_1 };
                                            return [3 /*break*/, 13];
                                        case 12:
                                            try {
                                                if (messages_4_1 && !messages_4_1.done && (_a = messages_4.return)) _a.call(messages_4);
                                            }
                                            finally { if (e_5) throw e_5.error; }
                                            return [7 /*endfinally*/];
                                        case 13: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function notifyNewSipMessagesToSend() {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 1:
                        (_a.sent()).forEach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
                            var messages, evtTracer, status, error_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, db.semasim.getUndeliveredMessagesOfUaInstance(sipContact_1.Contact.buildUaInstancePk(contact))];
                                    case 1:
                                        messages = _a.sent();
                                        if (!messages.length)
                                            return [2 /*return*/];
                                        _a.label = 2;
                                    case 2:
                                        _a.trys.push([2, 4, , 5]);
                                        evtTracer = new ts_events_extended_1.SyncEvent();
                                        sipContact_1.contactIo.wakeUpContact(contact, 0, evtTracer);
                                        return [4 /*yield*/, evtTracer.waitFor()];
                                    case 3:
                                        status = _a.sent();
                                        if (status !== "REACHABLE")
                                            return [2 /*return*/];
                                        sendPendingSipMessagesToReachableContact(contact);
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_4 = _a.sent();
                                        return [2 /*return*/];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [2 /*return*/];
                }
            });
        });
    }
    sipMessage.evtMessage.attach(function (_a) {
        var fromContact = _a.fromContact, toNumber = _a.toNumber, text = _a.text;
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("FROM SIP MESSAGE", { toNumber: toNumber, text: text });
                        return [4 /*yield*/, db.semasim.addMessageTowardGsm(toNumber, text, sipContact_1.Contact.buildUaInstancePk(fromContact))];
                    case 1:
                        _a.sent();
                        sendDonglePendingMessages(fromContact.endpoint);
                        return [2 /*return*/];
                }
            });
        });
    });
    dongleClient.evtNewMessage.attach(function (_a) {
        var imei = _a.imei, imsi = _a.imsi, number = _a.number, text = _a.text, date = _a.date;
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("FROM DONGLE MESSAGE", { text: text });
                        return [4 /*yield*/, db.semasim.addMessageTowardSip(phone.toNationalNumber(number, imsi), text, date, { "allUaInstanceOfImei": imei })];
                    case 1:
                        _a.sent();
                        notifyNewSipMessagesToSend();
                        return [2 /*return*/];
                }
            });
        });
    });
    dongleClient.evtMessageStatusReport.attach(function (_a) {
        var imei = _a.imei, imsi = _a.imsi, messageId = _a.messageId, isDelivered = _a.isDelivered, dischargeTime = _a.dischargeTime, recipient = _a.recipient, status = _a.status;
        return __awaiter(_this, void 0, void 0, function () {
            var resp, sender, text;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("FROM DONGLE STATUS REPORT", status);
                        return [4 /*yield*/, db.semasim.getSenderAndTextOfSentMessageToGsm(imei, messageId)];
                    case 1:
                        resp = _a.sent();
                        if (!resp)
                            return [2 /*return*/];
                        sender = resp.sender, text = resp.text;
                        return [4 /*yield*/, db.semasim.addMessageTowardSip(phone.toNationalNumber(recipient, imsi), "---STATUS REPORT FOR MESSAGE ID " + messageId + ": " + status + "---", dischargeTime, { "uaInstance": sender })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, db.semasim.addMessageTowardSip(recipient, "YOU:\n" + text, dischargeTime, { "allUaInstanceOfEndpointOtherThan": sender })];
                    case 3:
                        _a.sent();
                        notifyNewSipMessagesToSend();
                        return [2 /*return*/];
                }
            });
        });
    });
}
