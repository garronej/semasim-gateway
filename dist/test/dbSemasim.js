"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbSemasim = void 0;
var assert = require("assert");
var db = require("../lib/dbSemasim");
var crypto = require("crypto");
var ttTesting = require("transfer-tools/dist/lib/testing");
var assertSame = ttTesting.assertSame;
var generateUa = function (email) {
    if (email === void 0) { email = ttTesting.genHexStr(10) + "@foo.com"; }
    return ({
        "instance": "\"<urn:uuid:" + ttTesting.genHexStr(30) + ">\"",
        "platform": Date.now() % 2 ? "android" : "ios",
        "pushToken": ttTesting.genHexStr(60),
        "userEmail": email,
        "towardUserEncryptKeyStr": crypto.randomBytes(254).toString("binary")
    });
};
function testDbSemasim() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.launch()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 2000); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, t1()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, t2()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, t3()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, t4()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, t5()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, t6()];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, t7()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, t8()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, db.flush()];
                case 11:
                    _a.sent();
                    console.log("ALL TESTS DB SEMASIM PASSED");
                    return [2 /*return*/];
            }
        });
    });
}
exports.testDbSemasim = testDbSemasim;
function t1() {
    return __awaiter(this, void 0, void 0, function () {
        var uaSim, _a, _b, _c, _d, imsi2, _e, _f, _g;
        var _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _j.sent();
                    uaSim = {
                        "imsi": ttTesting.genDigits(15),
                        "ua": generateUa()
                    };
                    _a = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 2:
                    _a.apply(void 0, [_j.sent(), {}]);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 3:
                    _b.apply(void 0, [_j.sent(), { "isFirstUaForSim": true }]);
                    _c = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 4:
                    _c.apply(void 0, [_j.sent(), { "isFirstUaForSim": false }]);
                    uaSim.ua.pushToken = ttTesting.genHexStr(60);
                    _d = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 5:
                    _d.apply(void 0, [_j.sent(), { "isFirstUaForSim": false }]);
                    imsi2 = "123456789123456";
                    _e = assertSame;
                    return [4 /*yield*/, db.addUaSim({
                            "imsi": imsi2,
                            "ua": uaSim.ua
                        })];
                case 6:
                    _e.apply(void 0, [_j.sent(), { "isFirstUaForSim": true }]);
                    _f = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 7:
                    _f.apply(void 0, [_j.sent(), (_h = {},
                            _h[uaSim.imsi] = new Date(0),
                            _h[imsi2] = new Date(0),
                            _h)]);
                    _g = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(uaSim.imsi)];
                case 8:
                    _g.apply(void 0, [_j.sent(), []]);
                    console.log("ADD UA PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t2() {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, email, messagesTowardGsm, uas, i, ua, _a, sendingUa, i, message, _b, _c, checkMark, crossMark, _loop_1;
        var _d;
        var _this = this;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _e.sent();
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    messagesTowardGsm = [];
                    uas = [];
                    i = 0;
                    _e.label = 2;
                case 2:
                    if (!(i < 10)) return [3 /*break*/, 5];
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _a.apply(void 0, [_e.sent(), { "isFirstUaForSim": i === 0 }]);
                    uas.push(ua);
                    _e.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    sendingUa = uas[0];
                    i = 0;
                    _e.label = 6;
                case 6:
                    if (!(i < 5)) return [3 /*break*/, 9];
                    message = {
                        "dateTime": Date.now(),
                        "text": ttTesting.genUtf8Str(300),
                        "toNumber": ttTesting.genDigits(10),
                        "uaSim": {
                            imsi: imsi,
                            "ua": sendingUa
                        },
                        "appendPromotionalMessage": Date.now() % 2 === 0
                    };
                    return [4 /*yield*/, db.onSipMessage(message.toNumber, message.text, message.uaSim, new Date(message.dateTime), message.appendPromotionalMessage)];
                case 7:
                    _e.sent();
                    messagesTowardGsm.push(message);
                    _e.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 6];
                case 9:
                    _b = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 10:
                    _b.apply(void 0, [_e.sent(), (_d = {},
                            _d[imsi] = new Date(0),
                            _d)]);
                    _c = __read([
                        "e29c94",
                        "e29d8c"
                    ].map(function (code) { return Buffer.from(code, "hex").toString("utf8"); }), 2), checkMark = _c[0], crossMark = _c[1];
                    _loop_1 = function () {
                        var _a, _b, messageTowardGsm, _c, onSent, onStatusReport, sendDate, statusReport, bundledData, __i, __in, _d, _e, ua, o, _f, _g, mts, setSent, e_1_1, _h, _j, ua, o, _k, _l, mts, setSent, e_2_1;
                        var e_1, _m, e_2, _o;
                        return __generator(this, function (_p) {
                            switch (_p.label) {
                                case 0:
                                    _a = assertSame;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                                case 1:
                                    _a.apply(void 0, [(_p.sent()).map(function (v) { return v[0]; }), messagesTowardGsm]);
                                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                                case 2:
                                    _b = __read.apply(void 0, [(_p.sent())[0], 2]), messageTowardGsm = _b[0], _c = _b[1], onSent = _c.onSent, onStatusReport = _c.onStatusReport;
                                    assertSame(messageTowardGsm, messagesTowardGsm[0]);
                                    sendDate = (messagesTowardGsm.length % 3 === 0) ? null : new Date();
                                    return [4 /*yield*/, onSent(sendDate)];
                                case 3:
                                    _p.sent();
                                    messagesTowardGsm.shift();
                                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                            var o, _a, _b, mts, setSent;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0: return [4 /*yield*/, db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim)];
                                                    case 1:
                                                        o = _c.sent();
                                                        assertSame(o.length, 1);
                                                        _a = __read(o, 1), _b = __read(_a[0], 2), mts = _b[0], setSent = _b[1];
                                                        assertSame(mts, {
                                                            "fromNumber": messageTowardGsm.toNumber,
                                                            "dateTime": mts.dateTime,
                                                            "isFromDongle": false,
                                                            "bundledData": {
                                                                "type": "SEND REPORT",
                                                                "messageTowardGsm": messageTowardGsm,
                                                                "sendDateTime": sendDate === null ? null : sendDate.getTime(),
                                                                "text": sendDate ? checkMark : crossMark
                                                            }
                                                        });
                                                        return [4 /*yield*/, setSent()];
                                                    case 2:
                                                        _c.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })()];
                                case 4:
                                    _p.sent();
                                    if (!sendDate) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    statusReport = void 0;
                                    if (messagesTowardGsm.length % 3) {
                                        statusReport = {
                                            "dischargeDate": new Date(),
                                            "isDelivered": false,
                                            "recipient": messageTowardGsm.toNumber,
                                            "sendDate": sendDate,
                                            "status": "DELIVERED KO"
                                        };
                                    }
                                    else {
                                        statusReport = {
                                            "dischargeDate": new Date(),
                                            "isDelivered": true,
                                            "recipient": messageTowardGsm.toNumber,
                                            "sendDate": sendDate,
                                            "status": "DELIVERED OK"
                                        };
                                    }
                                    return [4 /*yield*/, onStatusReport(statusReport)];
                                case 5:
                                    _p.sent();
                                    bundledData = {
                                        "type": "STATUS REPORT",
                                        messageTowardGsm: messageTowardGsm,
                                        "statusReport": {
                                            "dischargeDateTime": statusReport.dischargeDate.getTime(),
                                            "isDelivered": statusReport.isDelivered,
                                            "recipient": statusReport.recipient,
                                            "sendDateTime": statusReport.sendDate.getTime(),
                                            "status": statusReport.status
                                        },
                                        "text": statusReport.isDelivered ? "" + checkMark + checkMark : crossMark
                                    };
                                    __i = 0;
                                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                            var o, _a, _b, mts, setSent;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0: return [4 /*yield*/, db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim)];
                                                    case 1:
                                                        o = _c.sent();
                                                        assertSame(o.length, 1, "yo man" + __i++);
                                                        _a = __read(o, 1), _b = __read(_a[0], 2), mts = _b[0], setSent = _b[1];
                                                        assertSame(mts, {
                                                            "fromNumber": messageTowardGsm.toNumber,
                                                            "dateTime": mts.dateTime,
                                                            "isFromDongle": false,
                                                            bundledData: bundledData
                                                        });
                                                        return [4 /*yield*/, setSent()];
                                                    case 2:
                                                        _c.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })()];
                                case 6:
                                    _p.sent();
                                    if (!statusReport.isDelivered) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    __in = false;
                                    _p.label = 7;
                                case 7:
                                    _p.trys.push([7, 13, 14, 15]);
                                    _d = (e_1 = void 0, __values(uas.filter(function (ua) { return (ua.userEmail === messageTowardGsm.uaSim.ua.userEmail &&
                                        ua.instance !== messageTowardGsm.uaSim.ua.instance); }))), _e = _d.next();
                                    _p.label = 8;
                                case 8:
                                    if (!!_e.done) return [3 /*break*/, 12];
                                    ua = _e.value;
                                    __in = true;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ ua: ua, imsi: imsi })];
                                case 9:
                                    o = _p.sent();
                                    assertSame(o.length, 1);
                                    _f = __read(o, 1), _g = __read(_f[0], 2), mts = _g[0], setSent = _g[1];
                                    assertSame(mts, {
                                        "fromNumber": messageTowardGsm.toNumber,
                                        "dateTime": mts.dateTime,
                                        "isFromDongle": false,
                                        "bundledData": __assign(__assign({}, bundledData), { "text": "Me: " + messageTowardGsm.text })
                                    });
                                    return [4 /*yield*/, setSent()];
                                case 10:
                                    _p.sent();
                                    _p.label = 11;
                                case 11:
                                    _e = _d.next();
                                    return [3 /*break*/, 8];
                                case 12: return [3 /*break*/, 15];
                                case 13:
                                    e_1_1 = _p.sent();
                                    e_1 = { error: e_1_1 };
                                    return [3 /*break*/, 15];
                                case 14:
                                    try {
                                        if (_e && !_e.done && (_m = _d.return)) _m.call(_d);
                                    }
                                    finally { if (e_1) throw e_1.error; }
                                    return [7 /*endfinally*/];
                                case 15:
                                    assert(__in);
                                    __in = false;
                                    _p.label = 16;
                                case 16:
                                    _p.trys.push([16, 22, 23, 24]);
                                    _h = (e_2 = void 0, __values(uas.filter(function (ua) { return ua.userEmail !== messageTowardGsm.uaSim.ua.userEmail; }))), _j = _h.next();
                                    _p.label = 17;
                                case 17:
                                    if (!!_j.done) return [3 /*break*/, 21];
                                    ua = _j.value;
                                    __in = true;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ ua: ua, imsi: imsi })];
                                case 18:
                                    o = _p.sent();
                                    assertSame(o.length, 1);
                                    _k = __read(o, 1), _l = __read(_k[0], 2), mts = _l[0], setSent = _l[1];
                                    assertSame(mts, {
                                        "fromNumber": messageTowardGsm.toNumber,
                                        "dateTime": mts.dateTime,
                                        "isFromDongle": false,
                                        "bundledData": __assign(__assign({}, bundledData), { "text": messageTowardGsm.uaSim.ua.userEmail + ": " + messageTowardGsm.text })
                                    });
                                    return [4 /*yield*/, setSent()];
                                case 19:
                                    _p.sent();
                                    _p.label = 20;
                                case 20:
                                    _j = _h.next();
                                    return [3 /*break*/, 17];
                                case 21: return [3 /*break*/, 24];
                                case 22:
                                    e_2_1 = _p.sent();
                                    e_2 = { error: e_2_1 };
                                    return [3 /*break*/, 24];
                                case 23:
                                    try {
                                        if (_j && !_j.done && (_o = _h.return)) _o.call(_h);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                    return [7 /*endfinally*/];
                                case 24:
                                    assert(__in);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _e.label = 11;
                case 11: return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                case 12:
                    if (!(_e.sent()).length) return [3 /*break*/, 14];
                    return [5 /*yield**/, _loop_1()];
                case 13:
                    _e.sent();
                    return [3 /*break*/, 11];
                case 14:
                    console.log("SIP => DONGLE PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t3() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, imsi, email, uas, i, ua, _b, messagesTowardSipSrc, i, pduDate, messageTowardSip, _c, _d, uas_1, uas_1_1, ua, messagesTowardSip, _e, _f, _g, messageTowardSip, onSent, e_3_1;
        var _h, e_3, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _k.sent();
                    _a = assertSame;
                    return [4 /*yield*/, db.onDongleMessage(ttTesting.genDigits(10), ttTesting.genUtf8Str(100), new Date(), ttTesting.genDigits(15))];
                case 2:
                    _a.apply(void 0, [_k.sent(), false]);
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    uas = [];
                    i = 0;
                    _k.label = 3;
                case 3:
                    if (!(i < 12)) return [3 /*break*/, 6];
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 4:
                    _b.apply(void 0, [_k.sent(), { "isFirstUaForSim": i === 0 }]);
                    uas.push(ua);
                    _k.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    messagesTowardSipSrc = [];
                    i = 0;
                    _k.label = 7;
                case 7:
                    if (!(i < 3)) return [3 /*break*/, 10];
                    pduDate = new Date();
                    messageTowardSip = {
                        "bundledData": {
                            "type": "MESSAGE",
                            "pduDateTime": pduDate.getTime(),
                            "text": ttTesting.genUtf8Str(400)
                        },
                        "dateTime": pduDate.getTime(),
                        "fromNumber": ttTesting.genDigits(10),
                        "isFromDongle": true,
                    };
                    _c = assertSame;
                    return [4 /*yield*/, db.onDongleMessage(messageTowardSip.fromNumber, messageTowardSip.bundledData.text, new Date(messageTowardSip.dateTime), imsi)];
                case 8:
                    _c.apply(void 0, [_k.sent(), true]);
                    messagesTowardSipSrc.push(messageTowardSip);
                    _k.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 7];
                case 10:
                    _d = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 11:
                    _d.apply(void 0, [_k.sent(), (_h = {},
                            _h[imsi] = new Date(messagesTowardSipSrc[messagesTowardSipSrc.length - 1].dateTime),
                            _h)]);
                    _k.label = 12;
                case 12:
                    _k.trys.push([12, 21, 22, 23]);
                    uas_1 = __values(uas), uas_1_1 = uas_1.next();
                    _k.label = 13;
                case 13:
                    if (!!uas_1_1.done) return [3 /*break*/, 20];
                    ua = uas_1_1.value;
                    messagesTowardSip = __spread(messagesTowardSipSrc);
                    _e = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 14:
                    _e.apply(void 0, [(_k.sent())
                            .map(function (v) { return v[0]; }), messagesTowardSip]);
                    _k.label = 15;
                case 15: return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 16:
                    if (!(_k.sent()).length) return [3 /*break*/, 19];
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 17:
                    _f = __read.apply(void 0, [_k.sent(), 1]), _g = __read(_f[0], 2), messageTowardSip = _g[0], onSent = _g[1];
                    assertSame(messageTowardSip, messagesTowardSip[0]);
                    return [4 /*yield*/, onSent()];
                case 18:
                    _k.sent();
                    messagesTowardSip.shift();
                    return [3 /*break*/, 15];
                case 19:
                    uas_1_1 = uas_1.next();
                    return [3 /*break*/, 13];
                case 20: return [3 /*break*/, 23];
                case 21:
                    e_3_1 = _k.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 23];
                case 22:
                    try {
                        if (uas_1_1 && !uas_1_1.done && (_j = uas_1.return)) _j.call(uas_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 23:
                    console.log("SIP <= DONGLE PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t4() {
    return __awaiter(this, void 0, void 0, function () {
        var uaSimExt, _a, imsi, allowedUas, i, ua, _b, remainingUas, notAffectedUas, rows, rows_1, rows_1_1, row, ua;
        var e_4, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _d.sent();
                    uaSimExt = {
                        "imsi": ttTesting.genDigits(15),
                        "ua": generateUa()
                    };
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSimExt)];
                case 2:
                    _a.apply(void 0, [_d.sent(), { "isFirstUaForSim": true }]);
                    imsi = ttTesting.genDigits(15);
                    allowedUas = [];
                    i = 0;
                    _d.label = 3;
                case 3:
                    if (!(i < 15)) return [3 /*break*/, 6];
                    ua = generateUa();
                    if (allowedUas.length < 10) {
                        allowedUas.push(ua);
                    }
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 4:
                    _b.apply(void 0, [_d.sent(), { "isFirstUaForSim": allowedUas.length === 1 }]);
                    _d.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, db.removeUaSim(imsi, allowedUas)];
                case 7:
                    _d.sent();
                    remainingUas = [];
                    notAffectedUas = [];
                    return [4 /*yield*/, db._.query([
                            "SELECT ua.*, ua_sim.imsi",
                            "FROM ua",
                            "INNER JOIN ua_sim ON ua_sim.ua= ua.id_",
                            "GROUP BY ua.id_"
                        ].join("\n"))];
                case 8:
                    rows = _d.sent();
                    try {
                        for (rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                            row = rows_1_1.value;
                            ua = {
                                "instance": row["instance"],
                                "userEmail": row["user_email"],
                                "platform": row["platform"],
                                "pushToken": row["push_token"],
                                "towardUserEncryptKeyStr": row["toward_user_encrypt_key"]
                            };
                            if (row["imsi"] === imsi) {
                                remainingUas.push(ua);
                            }
                            else {
                                notAffectedUas.push(ua);
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_c = rows_1.return)) _c.call(rows_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    assertSame(remainingUas, allowedUas);
                    assertSame(notAffectedUas, [uaSimExt.ua]);
                    console.log("REMOVING UAS PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t5() {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, email, uas, i, ua, _a, missedCallNumber, uas_2, uas_2_1, ua, _b, _c, _d, messageTowardSip, e_5_1;
        var e_5, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _f.sent();
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    uas = [];
                    i = 0;
                    _f.label = 2;
                case 2:
                    if (!(i < 12)) return [3 /*break*/, 5];
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _a.apply(void 0, [_f.sent(), { "isFirstUaForSim": i === 0 }]);
                    uas.push(ua);
                    _f.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    missedCallNumber = ttTesting.genDigits(10);
                    return [4 /*yield*/, db.onMissedCall(imsi, missedCallNumber)];
                case 6:
                    _f.sent();
                    _f.label = 7;
                case 7:
                    _f.trys.push([7, 13, 14, 15]);
                    uas_2 = __values(uas), uas_2_1 = uas_2.next();
                    _f.label = 8;
                case 8:
                    if (!!uas_2_1.done) return [3 /*break*/, 12];
                    ua = uas_2_1.value;
                    _b = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 9:
                    _b.apply(void 0, [(_f.sent()).length, 1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _c = __read.apply(void 0, [_f.sent(), 1]), _d = __read(_c[0], 1), messageTowardSip = _d[0];
                    assertSame(messageTowardSip, {
                        "bundledData": {
                            "type": "MISSED CALL",
                            "dateTime": messageTowardSip.dateTime,
                            "text": "Missed call"
                        },
                        "dateTime": messageTowardSip.dateTime,
                        "fromNumber": missedCallNumber,
                        "isFromDongle": false
                    });
                    _f.label = 11;
                case 11:
                    uas_2_1 = uas_2.next();
                    return [3 /*break*/, 8];
                case 12: return [3 /*break*/, 15];
                case 13:
                    e_5_1 = _f.sent();
                    e_5 = { error: e_5_1 };
                    return [3 /*break*/, 15];
                case 14:
                    try {
                        if (uas_2_1 && !uas_2_1.done && (_e = uas_2.return)) _e.call(uas_2);
                    }
                    finally { if (e_5) throw e_5.error; }
                    return [7 /*endfinally*/];
                case 15:
                    console.log("NOTIFICATIONS ON MISSED CALL PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t6() {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, email, ringingUas, i, ua, _a, answeringUa, number, _b, _c, ua, _d, _e, _f, messageTowardSip, e_6_1;
        var e_6, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _h.sent();
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    ringingUas = [];
                    i = 0;
                    _h.label = 2;
                case 2:
                    if (!(i < 12)) return [3 /*break*/, 5];
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _a.apply(void 0, [_h.sent(), { "isFirstUaForSim": i === 0 }]);
                    ringingUas.push(ua);
                    _h.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    answeringUa = ringingUas.shift();
                    number = ttTesting.genDigits(10);
                    return [4 /*yield*/, db.onCallAnswered(number, imsi, answeringUa, ringingUas)];
                case 6:
                    _h.sent();
                    _h.label = 7;
                case 7:
                    _h.trys.push([7, 13, 14, 15]);
                    _b = __values(ringingUas.filter(function (_a) {
                        var userEmail = _a.userEmail;
                        return userEmail !== answeringUa.userEmail;
                    })), _c = _b.next();
                    _h.label = 8;
                case 8:
                    if (!!_c.done) return [3 /*break*/, 12];
                    ua = _c.value;
                    _d = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 9:
                    _d.apply(void 0, [(_h.sent()).length, 1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _e = __read.apply(void 0, [_h.sent(), 1]), _f = __read(_e[0], 1), messageTowardSip = _f[0];
                    assertSame(messageTowardSip, {
                        "bundledData": {
                            "type": "CALL ANSWERED BY",
                            "dateTime": messageTowardSip.dateTime,
                            "ua": answeringUa,
                            "text": "Call answered by " + answeringUa.userEmail
                        },
                        "dateTime": messageTowardSip.dateTime,
                        "fromNumber": number,
                        "isFromDongle": false
                    });
                    _h.label = 11;
                case 11:
                    _c = _b.next();
                    return [3 /*break*/, 8];
                case 12: return [3 /*break*/, 15];
                case 13:
                    e_6_1 = _h.sent();
                    e_6 = { error: e_6_1 };
                    return [3 /*break*/, 15];
                case 14:
                    try {
                        if (_c && !_c.done && (_g = _b.return)) _g.call(_b);
                    }
                    finally { if (e_6) throw e_6.error; }
                    return [7 /*endfinally*/];
                case 15:
                    console.log("ON CALL ANSWERED PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t7() {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, email, uas, i, ua, _a, number, callPlacedAtDateTime, callRingingAfterMs, callAnsweredAfterMs, callTerminatedAfterMs, tasks, _loop_2, uas_3, uas_3_1, ua;
        var e_7, _b;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _c.sent();
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    uas = [];
                    i = 0;
                    _c.label = 2;
                case 2:
                    if (!(i < 12)) return [3 /*break*/, 5];
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _a.apply(void 0, [_c.sent(), { "isFirstUaForSim": i === 0 }]);
                    uas.push(ua);
                    _c.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    number = ttTesting.genDigits(10);
                    callPlacedAtDateTime = Date.now();
                    callRingingAfterMs = 1000;
                    callAnsweredAfterMs = 5000;
                    callTerminatedAfterMs = 60000;
                    return [4 /*yield*/, db.onCallFromSipTerminated(number, imsi, callPlacedAtDateTime, callRingingAfterMs, callAnsweredAfterMs, callTerminatedAfterMs, uas[0])];
                case 6:
                    _c.sent();
                    tasks = [];
                    _loop_2 = function (ua) {
                        tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, o, _b, _c, messageTowardSip, text;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _a = assertSame;
                                        return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                                    case 1:
                                        _a.apply(void 0, [(_d.sent()).length, 1]);
                                        return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                                    case 2:
                                        o = _d.sent();
                                        assertSame(o.length, 1);
                                        _b = __read(o, 1), _c = __read(_b[0], 1), messageTowardSip = _c[0];
                                        text = messageTowardSip.bundledData.text;
                                        assertSame(messageTowardSip, {
                                            "bundledData": {
                                                "type": "FROM SIP CALL SUMMARY",
                                                callPlacedAtDateTime: callPlacedAtDateTime,
                                                callRingingAfterMs: callRingingAfterMs,
                                                callAnsweredAfterMs: callAnsweredAfterMs,
                                                callTerminatedAfterMs: callTerminatedAfterMs,
                                                text: text,
                                                "ua": uas[0]
                                            },
                                            "dateTime": messageTowardSip.dateTime,
                                            "fromNumber": number,
                                            "isFromDongle": false
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        }); })();
                    };
                    try {
                        for (uas_3 = __values(uas), uas_3_1 = uas_3.next(); !uas_3_1.done; uas_3_1 = uas_3.next()) {
                            ua = uas_3_1.value;
                            _loop_2(ua);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (uas_3_1 && !uas_3_1.done && (_b = uas_3.return)) _b.call(uas_3);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    return [4 /*yield*/, Promise.all(tasks)];
                case 7:
                    _c.sent();
                    console.log("NOTIFICATIONS SIP CALL SUMMARY PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t8() {
    return __awaiter(this, void 0, void 0, function () {
        var uasPreGenerated, _a, _b, imsi, uas, i, ua, uasPreGenerated_1, uasPreGenerated_1_1, ua, e_8_1, _c, e_9_1;
        var e_9, _d, e_8, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _f.sent();
                    uasPreGenerated = new Array(12).fill("").map(function () { return generateUa(); });
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 18, 19, 20]);
                    _a = __values(new Array(10).fill("").map(function () { return ttTesting.genDigits(15); })), _b = _a.next();
                    _f.label = 3;
                case 3:
                    if (!!_b.done) return [3 /*break*/, 17];
                    imsi = _b.value;
                    uas = [];
                    i = 0;
                    _f.label = 4;
                case 4:
                    if (!(i < 16)) return [3 /*break*/, 7];
                    ua = generateUa();
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 5:
                    _f.sent(),
                        uas.push(ua);
                    _f.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 4];
                case 7:
                    _f.trys.push([7, 12, 13, 14]);
                    uasPreGenerated_1 = (e_8 = void 0, __values(uasPreGenerated)), uasPreGenerated_1_1 = uasPreGenerated_1.next();
                    _f.label = 8;
                case 8:
                    if (!!uasPreGenerated_1_1.done) return [3 /*break*/, 11];
                    ua = uasPreGenerated_1_1.value;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 9:
                    _f.sent(),
                        uas.push(ua);
                    _f.label = 10;
                case 10:
                    uasPreGenerated_1_1 = uasPreGenerated_1.next();
                    return [3 /*break*/, 8];
                case 11: return [3 /*break*/, 14];
                case 12:
                    e_8_1 = _f.sent();
                    e_8 = { error: e_8_1 };
                    return [3 /*break*/, 14];
                case 13:
                    try {
                        if (uasPreGenerated_1_1 && !uasPreGenerated_1_1.done && (_e = uasPreGenerated_1.return)) _e.call(uasPreGenerated_1);
                    }
                    finally { if (e_8) throw e_8.error; }
                    return [7 /*endfinally*/];
                case 14:
                    _c = assertSame;
                    return [4 /*yield*/, db.getUas(imsi)];
                case 15:
                    _c.apply(void 0, [_f.sent(), uas]);
                    _f.label = 16;
                case 16:
                    _b = _a.next();
                    return [3 /*break*/, 3];
                case 17: return [3 /*break*/, 20];
                case 18:
                    e_9_1 = _f.sent();
                    e_9 = { error: e_9_1 };
                    return [3 /*break*/, 20];
                case 19:
                    try {
                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                    }
                    finally { if (e_9) throw e_9.error; }
                    return [7 /*endfinally*/];
                case 20:
                    console.log("GET UA TEST PASS");
                    return [2 /*return*/];
            }
        });
    });
}
if (require.main === module) {
    console.log("Run standalone");
    process.once("unhandledRejection", function (error) { throw error; });
    testDbSemasim().then(function () { return process.exit(0); });
}
