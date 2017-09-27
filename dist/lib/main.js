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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var agi = require("../tools/agiClient");
var sipContact_1 = require("./sipContact");
var sipApiBackend = require("./sipApiClientBackend");
var db = require("./db");
var sipProxy = require("./sipProxy");
var sipMessage = require("./sipMessage");
var phone = require("../tools/phoneNumberLibrary");
var messageQueue = require("./messageQueue");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_main");
var dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
debug("Starting semasim gateway !");
//TODO: force re register on startup
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
        var _, number, imei, wakeUpAllContactsPromise, imsi, dialString, _a, failure;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _ = channel.relax;
                    number = channel.request.callerid;
                    debug("Call from " + number + " !");
                    return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                case 1:
                    imei = (_b.sent());
                    wakeUpAllContactsPromise = sipContact_1.wakeUpAllContactsOfEndpoint(imei, 9000);
                    return [4 /*yield*/, _.getVariable("DONGLEIMSI")];
                case 2:
                    imsi = (_b.sent());
                    return [4 /*yield*/, _.setVariable("CALLERID(all)", "\"\" <" + phone.toNationalNumber(number, imsi) + ">")];
                case 3:
                    _b.sent();
                    _a = sipContact_1.buildDialString;
                    return [4 /*yield*/, wakeUpAllContactsPromise];
                case 4:
                    dialString = _a.apply(void 0, [(_b.sent()).reachableContacts]);
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
                    failure = _b.sent();
                    if (!failure) return [3 /*break*/, 7];
                    return [4 /*yield*/, db.semasim.addMessageTowardSip(number, _constants_1.c.strMissedCall, new Date(), { "allUaInstanceOfImei": imei })];
                case 6:
                    _b.sent();
                    messageQueue.notifyNewSipMessagesToSend();
                    return [3 /*break*/, 8];
                case 7:
                    debug("...Call ended");
                    _b.label = 8;
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
                        messageQueue.sendDonglePendingMessages(dongle.imei);
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
    db.asterisk.getEvtNewContact().attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var isNew;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("New contact: " + contact.pretty);
                    return [4 /*yield*/, db.semasim.addUaInstance(contact.uaInstance)];
                case 1:
                    isNew = _a.sent();
                    if (isNew)
                        debug("TODO: it's a new UA, send initialization messages");
                    messageQueue.sendPendingSipMessagesToReachableContact(contact);
                    return [2 /*return*/];
            }
        });
    }); });
    sipMessage.getEvtMessage().attach(function (_a) {
        var fromContact = _a.fromContact, toNumber = _a.toNumber, text = _a.text;
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("FROM SIP MESSAGE", { toNumber: toNumber, text: text });
                        return [4 /*yield*/, db.semasim.addMessageTowardGsm(toNumber, text, fromContact.uaInstance)];
                    case 1:
                        _a.sent();
                        messageQueue.sendDonglePendingMessages(fromContact.uaInstance.dongle_imei);
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
                        messageQueue.notifyNewSipMessagesToSend();
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
                        messageQueue.notifyNewSipMessagesToSend();
                        return [2 /*return*/];
                }
            });
        });
    });
}
