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
require("rejection-tracker").main(__dirname, "..", "..");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var db = require("./db");
var sipProxy = require("./sipProxy");
var sipMessage = require("./sipMessage");
var messageQueue = require("./messageQueue");
var voiceCallBridge = require("./voiceCallBridge");
var sipApiBackend = require("./sipApiBackedClientImplementation");
var sipApiServer = require("./sipApiGatewayServerImplementation");
var _debug = require("debug");
var debug = _debug("_main");
debug("Starting semasim gateway !");
(function launch() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleController.getInstance().initialization];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    error_1 = _a.sent();
                    debug("dongle-extended not initialized yet, scheduling retry...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 3:
                    _a.sent();
                    launch();
                    return [2 /*return*/];
                case 4:
                    debug("Launching...");
                    registerListeners();
                    return [4 /*yield*/, db.asterisk.startListeningPsContacts()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, sipMessage.startHandling()];
                case 6:
                    _a.sent();
                    voiceCallBridge.start();
                    sipProxy.start();
                    processGsmMessageIoOccurredWhileOffline();
                    debug("...started");
                    return [2 /*return*/];
            }
        });
    });
})();
function processGsmMessageIoOccurredWhileOffline() {
    return __awaiter(this, void 0, void 0, function () {
        var dc, _a, _b, dongle, lastMessageReceivedDateBySim, _c, _d, _i, imsi, messages, messages_1, messages_1_1, _e, number, text, date, e_1_1, e_2, _f, e_1, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    try {
                        for (_a = __values(dc.activeDongles.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                            dongle = _b.value;
                            messageQueue.sendMessagesOfDongle(dongle);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, db.semasim.lastMessageReceivedDateBySim()];
                case 1:
                    lastMessageReceivedDateBySim = _h.sent();
                    _c = [];
                    for (_d in lastMessageReceivedDateBySim)
                        _c.push(_d);
                    _i = 0;
                    _h.label = 2;
                case 2:
                    if (!(_i < _c.length)) return [3 /*break*/, 12];
                    imsi = _c[_i];
                    return [4 /*yield*/, dc.getMessagesOfSim({
                            imsi: imsi,
                            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
                            "flush": true,
                        })];
                case 3:
                    messages = _h.sent();
                    _h.label = 4;
                case 4:
                    _h.trys.push([4, 9, 10, 11]);
                    messages_1 = __values(messages), messages_1_1 = messages_1.next();
                    _h.label = 5;
                case 5:
                    if (!!messages_1_1.done) return [3 /*break*/, 8];
                    _e = messages_1_1.value, number = _e.number, text = _e.text, date = _e.date;
                    return [4 /*yield*/, db.semasim.MessageTowardSip.add(number, text, date, false, {
                            "target": "ALL UA REGISTERED TO SIM",
                            "imsi": imsi
                        })];
                case 6:
                    _h.sent();
                    _h.label = 7;
                case 7:
                    messages_1_1 = messages_1.next();
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_1_1 = _h.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (messages_1_1 && !messages_1_1.done && (_g = messages_1.return)) _g.call(messages_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function registerListeners() {
    var _this = this;
    var dc = chan_dongle_extended_client_1.DongleController.getInstance();
    sipProxy.evtNewBackendSocketConnect.attach(function (backendSocket) { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, dongle, e_3, _c;
        return __generator(this, function (_d) {
            debug("Connection established with backend");
            sipApiServer.startListening(backendSocket);
            sipApiBackend.init(backendSocket);
            try {
                for (_a = __values(dc.activeDongles.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                    dongle = _b.value;
                    sipApiBackend.notifySimOnline(dongle);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return [2 /*return*/];
        });
    }); });
    dc.dongles.evtSet.attach(function (_a) {
        var _b = __read(_a, 1), dongle = _b[0];
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle))
                    return [2 /*return*/];
                messageQueue.sendMessagesOfDongle(dongle);
                sipApiBackend.notifySimOnline(dongle);
                return [2 /*return*/];
            });
        });
    });
    dc.dongles.evtDelete.attach(function (_a) {
        var _b = __read(_a, 1), dongle = _b[0];
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle))
                    return [2 /*return*/];
                sipApiBackend.notifySimOffline(dongle.sim.imsi);
                return [2 /*return*/];
            });
        });
    });
    dc.evtMessage.attach(function (_a) {
        var dongle = _a.dongle, message = _a.message;
        return __awaiter(_this, void 0, void 0, function () {
            var isHandled;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("FROM DONGLE MESSAGE", { message: message });
                        return [4 /*yield*/, db.semasim.MessageTowardSip.add(message.number, message.text, message.date, false, {
                                "target": "ALL UA REGISTERED TO SIM",
                                "imsi": dongle.sim.imsi
                            })];
                    case 1:
                        isHandled = _b.sent();
                        if (isHandled) {
                            dc.getMessagesOfSim({
                                "imsi": dongle.sim.imsi,
                                "fromDate": message.date,
                                "toDate": message.date,
                                "flush": true
                            });
                        }
                        messageQueue.notifyNewSipMessagesToSend(dongle.sim.imsi);
                        return [2 /*return*/];
                }
            });
        });
    });
    db.asterisk.evtNewContact.attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var _a, isUaCreatedOrUpdated, isFirstUaForSim, messages, messages_2, messages_2_1, _b, number, text, date, e_4, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("Contact registered");
                    return [4 /*yield*/, db.semasim.addUaSim(contact.uaSim)];
                case 1:
                    _a = _d.sent(), isUaCreatedOrUpdated = _a.isUaCreatedOrUpdated, isFirstUaForSim = _a.isFirstUaForSim;
                    if (isUaCreatedOrUpdated) {
                        sipApiBackend.notifyNewOrUpdatedUa(contact.uaSim.ua);
                    }
                    if (!isFirstUaForSim) return [3 /*break*/, 3];
                    debug("First SIM UA");
                    return [4 /*yield*/, dc.getMessagesOfSim({
                            "imsi": contact.uaSim.imsi,
                            "flush": true
                        })];
                case 2:
                    messages = _d.sent();
                    try {
                        for (messages_2 = __values(messages), messages_2_1 = messages_2.next(); !messages_2_1.done; messages_2_1 = messages_2.next()) {
                            _b = messages_2_1.value, number = _b.number, text = _b.text, date = _b.date;
                            db.semasim.MessageTowardSip.add(number, text, date, false, {
                                "target": "ALL UA REGISTERED TO SIM",
                                "imsi": contact.uaSim.imsi
                            });
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (messages_2_1 && !messages_2_1.done && (_c = messages_2.return)) _c.call(messages_2);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    _d.label = 3;
                case 3:
                    messageQueue.sendMessagesOfContact(contact);
                    return [2 /*return*/];
            }
        });
    }); });
    sipMessage.evtMessage.attach(function (_a) {
        var fromContact = _a.fromContact, toNumber = _a.toNumber, text = _a.text;
        return __awaiter(_this, void 0, void 0, function () {
            var uaSim, dongle;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("FROM SIP MESSAGE", { toNumber: toNumber, text: text });
                        uaSim = fromContact.uaSim;
                        return [4 /*yield*/, db.semasim.MessageTowardGsm.add(toNumber, text, uaSim)];
                    case 1:
                        _b.sent();
                        dongle = Array.from(dc.activeDongles.values()).find(function (_a) {
                            var sim = _a.sim;
                            return sim.imsi === fromContact.uaSim.imsi;
                        });
                        if (!dongle)
                            return [2 /*return*/];
                        messageQueue.sendMessagesOfDongle(dongle);
                        return [2 /*return*/];
                }
            });
        });
    });
}
