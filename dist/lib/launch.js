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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_ami_1 = require("ts-ami");
var messagesDispatcher = require("./messagesDispatcher");
var voiceCallBridge = require("./voiceCallBridge");
var ts_events_extended_1 = require("ts-events-extended");
var i = require("../bin/installer");
var procAsterisk = require("./procAsterisk");
var procChanDongleExtended = require("./procChanDongleExtended");
var scripting_tools_1 = require("scripting-tools");
var logger = require("logger");
var dbSemasim = require("./dbSemasim");
var dbAsterisk = require("./dbAsterisk");
var backendConnection = require("./toBackend/connection");
var backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
var sipContactsMonitor = require("./sipContactsMonitor");
var sipMessagesMonitor = require("./sipMessagesMonitor");
var phone_number_1 = require("phone-number");
var cryptoLib = require("crypto-lib");
var workerThreadPoolId_1 = require("./misc/workerThreadPoolId");
var debug = logger.debugFactory();
function beforeExit() {
    return __awaiter(this, void 0, void 0, function () {
        var backendSocket;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    backendSocket = backendConnection.get();
                    if (!(backendSocket instanceof Promise)) {
                        backendSocket.destroy("Terminating the process");
                    }
                    cryptoLib.terminateWorkerThreads();
                    return [4 /*yield*/, Promise.all([
                            dbAsterisk.beforeExit().catch(function () { }),
                            dbSemasim.beforeExit().catch(function () { }),
                            //TODO sip proxy before exist.
                            scripting_tools_1.safePr(procChanDongleExtended.beforeExit(), 2500)
                                .then(function () { return procAsterisk.beforeExit(); })
                                .catch(function () { })
                        ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.beforeExit = beforeExit;
function launch() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("Starting semasim gateway ...");
                    cryptoLib.workerThreadPool.preSpawn(workerThreadPoolId_1.workerThreadPoolId, 1);
                    return [4 /*yield*/, procAsterisk.spawnAsterisk()];
                case 1:
                    _a.sent();
                    ts_ami_1.Ami.getInstance(undefined, i.ast_etc_dir_path)
                        .evtTcpConnectionClosed.attachOnce(function () { return Promise.reject(new Error("Asterisk TCP connection closed")); });
                    return [4 /*yield*/, procChanDongleExtended.spawnChanDongleExtended()];
                case 2:
                    _a.sent();
                    //TODO: rename init ? 
                    return [4 /*yield*/, dbAsterisk.launch()];
                case 3:
                    //TODO: rename init ? 
                    _a.sent();
                    return [4 /*yield*/, dbSemasim.launch()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, sipMessagesMonitor.init()];
                case 5:
                    _a.sent();
                    backendConnection.connect();
                    voiceCallBridge.initAgi();
                    registerListeners();
                    init();
                    debug("...started");
                    return [2 /*return*/];
            }
        });
    });
}
exports.launch = launch;
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var dc, _a, _b, dongle, lastMessageReceivedDateBySim, _c, _d, _i, imsi, messages, messages_1, messages_1_1, _e, number, text, date, e_1_1;
        var e_2, _f, e_1, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    try {
                        for (_a = __values(dc.usableDongles.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                            dongle = _b.value;
                            messagesDispatcher.sendMessagesOfDongle(dongle);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, dbSemasim.lastMessageReceivedDateBySim()];
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
                    return [4 /*yield*/, dc.getMessages({
                            imsi: imsi,
                            "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
                            "flush": true
                        })];
                case 3:
                    messages = _h.sent();
                    _h.label = 4;
                case 4:
                    _h.trys.push([4, 9, 10, 11]);
                    messages_1 = (e_1 = void 0, __values(messages)), messages_1_1 = messages_1.next();
                    _h.label = 5;
                case 5:
                    if (!!messages_1_1.done) return [3 /*break*/, 8];
                    _e = messages_1_1.value, number = _e.number, text = _e.text, date = _e.date;
                    return [4 /*yield*/, dbSemasim.onDongleMessage(number, text, date, imsi)];
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
    backendConnection.evtConnect.attach(function () {
        var e_3, _a;
        debug("Connection established with backend");
        try {
            for (var _b = __values(dc.dongles.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var dongle = _c.value;
                if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
                    backendRemoteApiCaller.notifyLockedDongle(dongle);
                }
                else {
                    backendRemoteApiCaller.notifySimOnline(dongle);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    });
    {
        var prKeysByImei_1 = new Map();
        var generateKeys_1 = function () { return cryptoLib.rsa.generateKeys(null, 128); };
        dc.dongles.evtSet.attach(function (_a) {
            var _b = __read(_a, 1), dongle = _b[0];
            return __awaiter(_this, void 0, void 0, function () {
                var imei, imsi, _c, _d, publicKey, privateKey;
                var _this = this;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            imei = dongle.imei;
                            if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
                                backendRemoteApiCaller.notifyLockedDongle(dongle);
                                prKeysByImei_1.set(imei, generateKeys_1());
                                return [2 /*return*/];
                            }
                            imsi = dongle.sim.imsi;
                            _c = undefined;
                            return [4 /*yield*/, dbSemasim.getTowardSimKeys(imsi)];
                        case 1:
                            if (!(_c === (_e.sent()))) return [3 /*break*/, 4];
                            return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                    var prKeys;
                                    return __generator(this, function (_a) {
                                        prKeys = prKeysByImei_1.get(imei);
                                        if (prKeys === undefined) {
                                            prKeys = generateKeys_1();
                                        }
                                        else {
                                            prKeysByImei_1.delete(imei);
                                        }
                                        return [2 /*return*/, prKeys];
                                    });
                                }); })()];
                        case 2:
                            _d = _e.sent(), publicKey = _d.publicKey, privateKey = _d.privateKey;
                            return [4 /*yield*/, dbSemasim.setTowardSimKeys(imsi, cryptoLib.RsaKey.stringify(publicKey), cryptoLib.RsaKey.stringify(privateKey))];
                        case 3:
                            _e.sent();
                            _e.label = 4;
                        case 4:
                            messagesDispatcher.sendMessagesOfDongle(dongle);
                            backendRemoteApiCaller.notifySimOnline(dongle);
                            return [2 /*return*/];
                    }
                });
            });
        });
    }
    dc.dongles.evtDelete.attach(function (_a) {
        var _b = __read(_a, 1), dongle = _b[0];
        return backendRemoteApiCaller.notifyDongleOffline(dongle);
    });
    dc.evtMessage.attach(function (_a) {
        var dongle = _a.dongle, message = _a.message, submitShouldSave = _a.submitShouldSave;
        return __awaiter(_this, void 0, void 0, function () {
            var evtShouldSave, wasAdded;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("FROM DONGLE MESSAGE", { message: message });
                        evtShouldSave = new ts_events_extended_1.SyncEvent();
                        submitShouldSave(evtShouldSave.waitFor());
                        return [4 /*yield*/, dbSemasim.onDongleMessage(phone_number_1.phoneNumber.build(message.number, !!dongle.sim.country ? dongle.sim.country.iso : undefined), message.text, message.date, dongle.sim.imsi)];
                    case 1:
                        wasAdded = _b.sent();
                        if (wasAdded) {
                            messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);
                            evtShouldSave.post("DO NOT SAVE MESSAGE");
                        }
                        else {
                            evtShouldSave.post("SAVE MESSAGE");
                        }
                        return [2 /*return*/];
                }
            });
        });
    });
    sipContactsMonitor.evtContactRegistration.attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var _a, isUaCreatedOrUpdated, isFirstUaForSim, messages, tasks, messages_2, messages_2_1, _b, number, text, date;
        var e_4, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("Contact registered", contact);
                    return [4 /*yield*/, dbSemasim.addUaSim(contact.uaSim)];
                case 1:
                    _a = _d.sent(), isUaCreatedOrUpdated = _a.isUaCreatedOrUpdated, isFirstUaForSim = _a.isFirstUaForSim;
                    if (!isUaCreatedOrUpdated) return [3 /*break*/, 3];
                    return [4 /*yield*/, backendRemoteApiCaller.notifyNewOrUpdatedUa(contact.uaSim.ua)];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    if (!isFirstUaForSim) return [3 /*break*/, 6];
                    debug("First SIM UA");
                    return [4 /*yield*/, dc.getMessages({
                            "imsi": contact.uaSim.imsi,
                            "flush": true
                        })];
                case 4:
                    messages = _d.sent();
                    tasks = [];
                    try {
                        for (messages_2 = __values(messages), messages_2_1 = messages_2.next(); !messages_2_1.done; messages_2_1 = messages_2.next()) {
                            _b = messages_2_1.value, number = _b.number, text = _b.text, date = _b.date;
                            tasks[tasks.length] = dbSemasim.onDongleMessage(number, text, date, contact.uaSim.imsi);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (messages_2_1 && !messages_2_1.done && (_c = messages_2.return)) _c.call(messages_2);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    return [4 /*yield*/, Promise.all(tasks)];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    messagesDispatcher.sendMessagesOfContact(contact);
                    return [2 /*return*/];
            }
        });
    }); });
    sipMessagesMonitor.evtMessage.attach(function (_a) {
        var fromContact = _a.fromContact, toNumber = _a.toNumber, text = _a.text, exactSendDate = _a.exactSendDate, appendPromotionalMessage = _a.appendPromotionalMessage;
        return __awaiter(_this, void 0, void 0, function () {
            var uaSim, dongle;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("FROM SIP MESSAGE", { toNumber: toNumber, text: text });
                        uaSim = fromContact.uaSim;
                        return [4 /*yield*/, dbSemasim.onSipMessage(toNumber, text, uaSim, exactSendDate, appendPromotionalMessage)];
                    case 1:
                        _b.sent();
                        dongle = Array.from(dc.usableDongles.values()).find(function (_a) {
                            var sim = _a.sim;
                            return sim.imsi === uaSim.imsi;
                        });
                        if (!dongle) {
                            debug("Target dongle not usable".red);
                            return [2 /*return*/];
                        }
                        messagesDispatcher.sendMessagesOfDongle(dongle);
                        return [2 /*return*/];
                }
            });
        });
    });
}
