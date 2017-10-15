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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var db = require("./db");
var AsyncLock = require("async-lock");
var sipApiBackend = require("./sipApiClientBackend");
var sipContact_1 = require("./sipContact");
var sipMessage = require("./sipMessage");
var _debug = require("debug");
var debug = _debug("_messageQueue");
var checkMark = (new Buffer("e29c94", "hex")).toString("utf8");
var crossMark = (new Buffer("e29d8c", "hex")).toString("utf8");
var lockDongle = new AsyncLock();
function sendMessagesOfDongle(endpoint) {
    var _this = this;
    lockDongle.acquire(endpoint.dongle.imei, function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var dc, _loop_1, _a, _b, _c, message, _d, setSent, setStatusReport, state_1, e_1_1, e_1, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    _loop_1 = function (message, setSent, setStatusReport) {
                        var sendMessageResult, _a, sendDate, prSetSent;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    sendMessageResult = void 0;
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, dc.sendMessage(endpoint.dongle.imei, message.to_number, message.text)];
                                case 2:
                                    sendMessageResult = _b.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    _a = _b.sent();
                                    return [2 /*return*/, { value: void 0 }];
                                case 4:
                                    if (!!sendMessageResult.success) return [3 /*break*/, 7];
                                    if (!(sendMessageResult.reason !== "DISCONNECT")) return [3 /*break*/, 6];
                                    return [4 /*yield*/, setSent(null)];
                                case 5:
                                    _b.sent();
                                    return [2 /*return*/, "continue"];
                                case 6: return [2 /*return*/, { value: void 0 }];
                                case 7:
                                    sendDate = sendMessageResult.sendDate;
                                    prSetSent = setSent(sendDate);
                                    db.semasim.MessageTowardSip.add(message.to_number, checkMark, sendDate, true, {
                                        "is": "UA_ENDPOINT",
                                        "uaEndpoint": message.uaEndpoint
                                    }).then(function () { return notifyNewSipMessagesToSend(message.uaEndpoint.endpoint); });
                                    dc.evtStatusReport.attachOnce(function (_a) {
                                        var statusReport = _a.statusReport;
                                        return statusReport.sendDate.getTime() === sendDate.getTime();
                                    }, function (_a) {
                                        var statusReport = _a.statusReport;
                                        return __awaiter(_this, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, prSetSent];
                                                    case 1:
                                                        _a.sent();
                                                        setStatusReport(statusReport);
                                                        if (!statusReport.isDelivered) return [3 /*break*/, 4];
                                                        //TODO: may be useless...depend of operator I assume
                                                        if (isNaN(statusReport.dischargeDate.getTime())) {
                                                            statusReport.dischargeDate = new Date();
                                                        }
                                                        ;
                                                        return [4 /*yield*/, db.semasim.MessageTowardSip.add(message.to_number, "" + checkMark + checkMark, statusReport.dischargeDate, true, {
                                                                "is": "UA_ENDPOINT",
                                                                "uaEndpoint": message.uaEndpoint
                                                            })];
                                                    case 2:
                                                        _a.sent();
                                                        return [4 /*yield*/, db.semasim.MessageTowardSip.add(message.to_number, "you sent from " + message.uaEndpoint.ua.software + ":\n" + message.text, sendDate, true, {
                                                                "is": "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA",
                                                                "endpoint": message.uaEndpoint.endpoint,
                                                                "excludeUa": message.uaEndpoint.ua
                                                            })];
                                                    case 3:
                                                        _a.sent();
                                                        return [3 /*break*/, 6];
                                                    case 4: return [4 /*yield*/, db.semasim.MessageTowardSip.add(message.to_number, crossMark, statusReport.dischargeDate, true, {
                                                            "is": "UA_ENDPOINT",
                                                            "uaEndpoint": message.uaEndpoint
                                                        })];
                                                    case 5:
                                                        _a.sent();
                                                        _a.label = 6;
                                                    case 6:
                                                        notifyNewSipMessagesToSend(message.uaEndpoint.endpoint);
                                                        return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, db.semasim.MessageTowardGsm.getUnsent(endpoint)];
                case 2:
                    _a = __values.apply(void 0, [_f.sent()]), _b = _a.next();
                    _f.label = 3;
                case 3:
                    if (!!_b.done) return [3 /*break*/, 6];
                    _c = __read(_b.value, 2), message = _c[0], _d = _c[1], setSent = _d.setSent, setStatusReport = _d.setStatusReport;
                    return [5 /*yield**/, _loop_1(message, setSent, setStatusReport)];
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
function notifyNewSipMessagesToSend(fromEndpoint) {
    var _this = this;
    db.asterisk.getContacts(fromEndpoint).then(function (contacts) { return contacts.forEach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var unsentCount, status;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.semasim.MessageTowardSip.unsentCount(contact.uaEndpoint)];
                case 1:
                    unsentCount = _a.sent();
                    if (!unsentCount)
                        return [2 /*return*/];
                    return [4 /*yield*/, sipApiBackend.wakeUpContact.makeCall(contact)];
                case 2:
                    status = _a.sent();
                    if (status !== "REACHABLE")
                        return [2 /*return*/];
                    sendMessagesOfContact(contact);
                    return [2 /*return*/];
            }
        });
    }); }); });
}
exports.notifyNewSipMessagesToSend = notifyNewSipMessagesToSend;
var lockUaEndpoint = new AsyncLock();
function sendMessagesOfContact(contact) {
    var _this = this;
    var uaEndpoint = contact.uaEndpoint;
    lockUaEndpoint.acquire(sipContact_1.Contact.UaEndpoint.id(uaEndpoint), function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, _c, message, setReceived, error_1, e_2_1, e_2, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 9, 10, 11]);
                    return [4 /*yield*/, db.semasim.MessageTowardSip.getUnsent(uaEndpoint)];
                case 1:
                    _a = __values.apply(void 0, [_e.sent()]), _b = _a.next();
                    _e.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 8];
                    _c = __read(_b.value, 2), message = _c[0], setReceived = _c[1];
                    debug("sip sending: " + JSON.stringify(message.text) + " from " + message.from_number);
                    _e.label = 3;
                case 3:
                    _e.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, sipMessage.sendMessage(contact, message.from_number, {}, message.text)];
                case 4:
                    _e.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _e.sent();
                    debug("sip Send Message error:", error_1.message);
                    return [2 /*return*/];
                case 6:
                    setReceived();
                    _e.label = 7;
                case 7:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_2_1 = _e.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); });
}
exports.sendMessagesOfContact = sendMessagesOfContact;
