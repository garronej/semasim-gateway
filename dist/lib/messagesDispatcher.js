"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
exports.sendMessagesOfContact = exports.notifyNewSipMessagesToSend = exports.sendMessagesOfDongle = void 0;
var AsyncLock = require("async-lock");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var dbSemasim = require("./dbSemasim");
var misc_1 = require("./misc/misc");
var bundledData_1 = require("./misc/bundledData");
var logger_1 = require("../tools/logger");
var sipMessagesMonitor = require("./sipMessagesMonitor");
var cryptoLib = require("crypto-lib");
var workerThreadPoolId_1 = require("./misc/workerThreadPoolId");
var getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered_1 = require("./misc/getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered");
var debug = logger_1.logger.debugFactory();
function sendMessagesOfDongle(dongle) {
    var _this = this;
    sendMessagesOfDongle.lock.acquire(dongle.imei, function () { return __awaiter(_this, void 0, void 0, function () {
        var dc, _loop_1, _a, _b, _c, message, _d, onSent, onStatusReport, state_1, e_1_1;
        var e_1, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    _loop_1 = function (message, onSent, onStatusReport) {
                        var sendMessageResult, _a, sendDate;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    sendMessageResult = void 0;
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, dc.sendMessage(dongle.imei, message.toNumber, message.text
                                            + (message.appendPromotionalMessage ? "\n\nSent via Semasim.com" : ""))];
                                case 2:
                                    sendMessageResult = _b.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    _a = _b.sent();
                                    return [2 /*return*/, { value: void 0 }];
                                case 4:
                                    sendDate = sendMessageResult.success ?
                                        sendMessageResult.sendDate : null;
                                    onSent(sendDate).then(function () { return notifyNewSipMessagesToSend(dongle.sim.imsi); });
                                    if (!sendMessageResult.success) {
                                        debug("Dongle send error".red, { sendMessageResult: sendMessageResult });
                                        if (sendMessageResult.reason === "DISCONNECT") {
                                            return [2 /*return*/, { value: void 0 }];
                                        }
                                        else {
                                            return [2 /*return*/, "continue"];
                                        }
                                    }
                                    dc.evtStatusReport.attachOnce(function (_a) {
                                        var statusReport = _a.statusReport;
                                        return statusReport.sendDate.getTime() === sendDate.getTime();
                                    }, function (_a) {
                                        var statusReport = _a.statusReport;
                                        return onStatusReport(statusReport)
                                            .then(function () { return notifyNewSipMessagesToSend(dongle.sim.imsi); });
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, dbSemasim.getUnsentMessagesTowardGsm(dongle.sim.imsi)];
                case 2:
                    _a = __values.apply(void 0, [_f.sent()]), _b = _a.next();
                    _f.label = 3;
                case 3:
                    if (!!_b.done) return [3 /*break*/, 6];
                    _c = __read(_b.value, 2), message = _c[0], _d = _c[1], onSent = _d.onSent, onStatusReport = _d.onStatusReport;
                    return [5 /*yield**/, _loop_1(message, onSent, onStatusReport)];
                case 4:
                    state_1 = _f.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _f.label = 5;
                case 5:
                    _b = _a.next();
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1_1 = _f.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); });
}
exports.sendMessagesOfDongle = sendMessagesOfDongle;
(function (sendMessagesOfDongle) {
    sendMessagesOfDongle.lock = new AsyncLock();
})(sendMessagesOfDongle = exports.sendMessagesOfDongle || (exports.sendMessagesOfDongle = {}));
function notifyNewSipMessagesToSend(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            /*
            for (const contact of sipContactsMonitor.getContacts(imsi)) {
        
                if (!(await dbSemasim.messageTowardSipUnsentCount(contact.uaSim))) {
                    continue;
                }
        
                if (
                    (await backendRemoteApiCaller.wakeUpContact(contact))
                    ===
                    "REACHABLE"
                ) {
                    sendMessagesOfContact(contact);
                }
        
            }
            */
            getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered_1.getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered({
                imsi: imsi,
                "asyncUaMatcher": function (ua) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = 0;
                            return [4 /*yield*/, dbSemasim.messageTowardSipUnsentCount({ imsi: imsi, ua: ua })];
                        case 1: return [2 /*return*/, _a !== (_b.sent())];
                    }
                }); }); },
                "reachableSipContactCallbackFn": function (contact) { return sendMessagesOfContact(contact); }
            });
            return [2 /*return*/];
        });
    });
}
exports.notifyNewSipMessagesToSend = notifyNewSipMessagesToSend;
/** Assert contact reachable  */
function sendMessagesOfContact(contact) {
    var _this = this;
    var encryptor = (function () {
        var encryptorMap = sendMessagesOfContact.encryptorMap;
        var towardUserEncryptKeyStr = contact.uaSim.ua.towardUserEncryptKeyStr;
        var out = encryptorMap.get(towardUserEncryptKeyStr);
        if (out === undefined) {
            out = cryptoLib.rsa.encryptorFactory(cryptoLib.RsaKey.parse(towardUserEncryptKeyStr), workerThreadPoolId_1.workerThreadPoolId);
            encryptorMap.set(towardUserEncryptKeyStr, out);
        }
        return out;
    })();
    sendMessagesOfContact.lock.acquire(misc_1.generateUaSimId(contact.uaSim), function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, _c, message, onReceived, _d, _e, _f, error_1, e_2_1;
        var e_2, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 10, 11, 12]);
                    return [4 /*yield*/, dbSemasim.getUnsentMessagesTowardSip(contact.uaSim)];
                case 1:
                    _a = __values.apply(void 0, [_h.sent()]), _b = _a.next();
                    _h.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 9];
                    _c = __read(_b.value, 2), message = _c[0], onReceived = _c[1];
                    _h.label = 3;
                case 3:
                    _h.trys.push([3, 6, , 7]);
                    _e = (_d = sipMessagesMonitor).sendMessage;
                    _f = [contact,
                        message.fromNumber];
                    return [4 /*yield*/, bundledData_1.smuggleBundledDataInHeaders(message.bundledData, encryptor)];
                case 4: return [4 /*yield*/, _e.apply(_d, _f.concat([_h.sent()]))];
                case 5:
                    _h.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _h.sent();
                    debug("sip Send Message error:", error_1.message);
                    return [2 /*return*/];
                case 7:
                    onReceived();
                    _h.label = 8;
                case 8:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 9: return [3 /*break*/, 12];
                case 10:
                    e_2_1 = _h.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 12];
                case 11:
                    try {
                        if (_b && !_b.done && (_g = _a.return)) _g.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    }); });
}
exports.sendMessagesOfContact = sendMessagesOfContact;
(function (sendMessagesOfContact) {
    sendMessagesOfContact.lock = new AsyncLock();
    sendMessagesOfContact.encryptorMap = new Map();
})(sendMessagesOfContact = exports.sendMessagesOfContact || (exports.sendMessagesOfContact = {}));
