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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var db = require("../lib/dbSemasim");
var ttTesting = require("transfer-tools/dist/lib/testing");
var assertSame = ttTesting.assertSame;
var sqliteCustom = require("sqlite-custom");
exports.generateUa = function (email) {
    if (email === void 0) { email = ttTesting.genHexStr(10) + "@foo.com"; }
    return ({
        "instance": "\"<urn:uuid:" + ttTesting.genHexStr(30) + ">\"",
        "platform": Date.now() % 2 ? "android" : "iOS",
        "pushToken": ttTesting.genHexStr(60),
        "userEmail": email,
        "messagesEnabled": true
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
                    return [4 /*yield*/, db.flush()];
                case 9:
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
        var _a, uaSim, _b, _c, _d, _e, imsi2, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _j.sent();
                    uaSim = {
                        "imsi": ttTesting.genDigits(15),
                        "ua": exports.generateUa()
                    };
                    _b = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 2:
                    _b.apply(void 0, [_j.sent(),
                        {}]);
                    _c = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 3:
                    _c.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": true }]);
                    _d = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 4:
                    _d.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": false }]);
                    uaSim.ua.pushToken = ttTesting.genHexStr(60);
                    _e = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 5:
                    _e.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": true }]);
                    imsi2 = "123456789123456";
                    _f = assertSame;
                    return [4 /*yield*/, db.addUaSim({
                            "imsi": imsi2,
                            "ua": uaSim.ua
                        })];
                case 6:
                    _f.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": false }]);
                    _g = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 7:
                    _g.apply(void 0, [_j.sent(), (_a = {},
                            _a[uaSim.imsi] = new Date(0),
                            _a[imsi2] = new Date(0),
                            _a)]);
                    _h = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(uaSim.imsi)];
                case 8:
                    _h.apply(void 0, [_j.sent(),
                        []]);
                    console.log("ADD UA PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t2() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, imsi, email, messagesTowardGsm, uas, i, ua, _b, sendingUa, i, message, _c, checkMark, crossMark, _loop_1;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _d.sent();
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    messagesTowardGsm = [];
                    uas = [];
                    i = 0;
                    _d.label = 2;
                case 2:
                    if (!(i < 10)) return [3 /*break*/, 5];
                    ua = exports.generateUa((i % 4 === 0) ? email : undefined);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _b.apply(void 0, [_d.sent(),
                        { "isFirstUaForSim": i === 0, "isUaCreatedOrUpdated": true }]);
                    uas.push(ua);
                    _d.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    sendingUa = uas[0];
                    i = 0;
                    _d.label = 6;
                case 6:
                    if (!(i < 5)) return [3 /*break*/, 9];
                    message = {
                        "date": new Date(),
                        "text": ttTesting.genUtf8Str(300),
                        "toNumber": ttTesting.genDigits(10),
                        "uaSim": {
                            imsi: imsi,
                            "ua": sendingUa
                        },
                        "appendPromotionalMessage": Date.now() % 2 === 0
                    };
                    return [4 /*yield*/, db.onSipMessage(message.toNumber, message.text, message.uaSim, message.date, message.appendPromotionalMessage)];
                case 7:
                    _d.sent();
                    messagesTowardGsm.push(message);
                    _d.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 6];
                case 9:
                    _c = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 10:
                    _c.apply(void 0, [_d.sent(), (_a = {},
                            _a[imsi] = new Date(0),
                            _a)]);
                    checkMark = Buffer.from("e29c94", "hex").toString("utf8");
                    crossMark = Buffer.from("e29d8c", "hex").toString("utf8");
                    _loop_1 = function () {
                        var e_1, _a, e_2, _b, _c, _d, messageTowardGsm, _e, onSent, onStatusReport, sendDate, statusReport, bundledData, __i, __in, _f, _g, ua, o, _h, _j, mts, setSent, e_1_1, _k, _l, ua, o, _m, _o, mts, setSent, e_2_1;
                        return __generator(this, function (_p) {
                            switch (_p.label) {
                                case 0:
                                    _c = assertSame;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                                case 1:
                                    _c.apply(void 0, [(_p.sent()).map(function (v) { return v[0]; }),
                                        messagesTowardGsm]);
                                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                                case 2:
                                    _d = __read.apply(void 0, [(_p.sent())[0], 2]), messageTowardGsm = _d[0], _e = _d[1], onSent = _e.onSent, onStatusReport = _e.onStatusReport;
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
                                                            "text": sendDate ? checkMark : crossMark,
                                                            "date": mts.date,
                                                            "isFromDongle": false,
                                                            "bundledData": {
                                                                "type": "SEND REPORT",
                                                                "messageTowardGsm": messageTowardGsm,
                                                                "sendDate": sendDate
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
                                        statusReport: statusReport
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
                                                            "text": statusReport.isDelivered ? "" + checkMark + checkMark : crossMark,
                                                            "date": mts.date,
                                                            "isFromDongle": false,
                                                            "bundledData": bundledData
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
                                    _f = __values(uas.filter(function (ua) { return (ua.userEmail === messageTowardGsm.uaSim.ua.userEmail &&
                                        ua.instance !== messageTowardGsm.uaSim.ua.instance); })), _g = _f.next();
                                    _p.label = 8;
                                case 8:
                                    if (!!_g.done) return [3 /*break*/, 12];
                                    ua = _g.value;
                                    __in = true;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ ua: ua, imsi: imsi })];
                                case 9:
                                    o = _p.sent();
                                    assertSame(o.length, 1);
                                    _h = __read(o, 1), _j = __read(_h[0], 2), mts = _j[0], setSent = _j[1];
                                    assertSame(mts, {
                                        "fromNumber": messageTowardGsm.toNumber,
                                        "text": "Me: " + messageTowardGsm.text,
                                        "date": mts.date,
                                        "isFromDongle": false,
                                        "bundledData": bundledData
                                    });
                                    return [4 /*yield*/, setSent()];
                                case 10:
                                    _p.sent();
                                    _p.label = 11;
                                case 11:
                                    _g = _f.next();
                                    return [3 /*break*/, 8];
                                case 12: return [3 /*break*/, 15];
                                case 13:
                                    e_1_1 = _p.sent();
                                    e_1 = { error: e_1_1 };
                                    return [3 /*break*/, 15];
                                case 14:
                                    try {
                                        if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
                                    }
                                    finally { if (e_1) throw e_1.error; }
                                    return [7 /*endfinally*/];
                                case 15:
                                    console.assert(__in);
                                    __in = false;
                                    _p.label = 16;
                                case 16:
                                    _p.trys.push([16, 22, 23, 24]);
                                    _k = __values(uas.filter(function (ua) { return ua.userEmail !== messageTowardGsm.uaSim.ua.userEmail; })), _l = _k.next();
                                    _p.label = 17;
                                case 17:
                                    if (!!_l.done) return [3 /*break*/, 21];
                                    ua = _l.value;
                                    __in = true;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ ua: ua, imsi: imsi })];
                                case 18:
                                    o = _p.sent();
                                    assertSame(o.length, 1);
                                    _m = __read(o, 1), _o = __read(_m[0], 2), mts = _o[0], setSent = _o[1];
                                    assertSame(mts, {
                                        "fromNumber": messageTowardGsm.toNumber,
                                        "text": messageTowardGsm.uaSim.ua.userEmail + ": " + messageTowardGsm.text,
                                        "date": mts.date,
                                        "isFromDongle": false,
                                        "bundledData": bundledData
                                    });
                                    return [4 /*yield*/, setSent()];
                                case 19:
                                    _p.sent();
                                    _p.label = 20;
                                case 20:
                                    _l = _k.next();
                                    return [3 /*break*/, 17];
                                case 21: return [3 /*break*/, 24];
                                case 22:
                                    e_2_1 = _p.sent();
                                    e_2 = { error: e_2_1 };
                                    return [3 /*break*/, 24];
                                case 23:
                                    try {
                                        if (_l && !_l.done && (_b = _k.return)) _b.call(_k);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                    return [7 /*endfinally*/];
                                case 24:
                                    console.assert(__in);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _d.label = 11;
                case 11: return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                case 12:
                    if (!(_d.sent()).length) return [3 /*break*/, 14];
                    return [5 /*yield**/, _loop_1()];
                case 13:
                    _d.sent();
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
        var _a, e_3, _b, _c, imsi, email, uas, i, ua, _d, messagesTowardSipSrc, i, pduDate, messageTowardSip, _e, _f, uas_1, uas_1_1, ua, messagesTowardSip, _g, _h, _j, messageTowardSip, onSent, e_3_1;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _k.sent();
                    _c = assertSame;
                    return [4 /*yield*/, db.onDongleMessage(ttTesting.genDigits(10), ttTesting.genUtf8Str(100), new Date(), ttTesting.genDigits(15))];
                case 2:
                    _c.apply(void 0, [_k.sent(),
                        false]);
                    imsi = ttTesting.genDigits(15);
                    email = ttTesting.genHexStr(10) + "@foo.com";
                    uas = [];
                    i = 0;
                    _k.label = 3;
                case 3:
                    if (!(i < 12)) return [3 /*break*/, 6];
                    ua = exports.generateUa((i % 4 === 0) ? email : undefined);
                    _d = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 4:
                    _d.apply(void 0, [_k.sent(),
                        {
                            "isFirstUaForSim": i === 0,
                            "isUaCreatedOrUpdated": true
                        }]);
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
                            "pduDate": pduDate
                        },
                        "date": pduDate,
                        "fromNumber": ttTesting.genDigits(10),
                        "isFromDongle": true,
                        "text": ttTesting.genUtf8Str(400)
                    };
                    _e = assertSame;
                    return [4 /*yield*/, db.onDongleMessage(messageTowardSip.fromNumber, messageTowardSip.text, messageTowardSip.date, imsi)];
                case 8:
                    _e.apply(void 0, [_k.sent(),
                        true]);
                    messagesTowardSipSrc.push(messageTowardSip);
                    _k.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 7];
                case 10:
                    _f = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 11:
                    _f.apply(void 0, [_k.sent(), (_a = {},
                            _a[imsi] = messagesTowardSipSrc[messagesTowardSipSrc.length - 1].date,
                            _a)]);
                    _k.label = 12;
                case 12:
                    _k.trys.push([12, 21, 22, 23]);
                    uas_1 = __values(uas), uas_1_1 = uas_1.next();
                    _k.label = 13;
                case 13:
                    if (!!uas_1_1.done) return [3 /*break*/, 20];
                    ua = uas_1_1.value;
                    messagesTowardSip = __spread(messagesTowardSipSrc);
                    _g = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 14:
                    _g.apply(void 0, [(_k.sent())
                            .map(function (v) { return v[0]; }),
                        messagesTowardSip]);
                    _k.label = 15;
                case 15: return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 16:
                    if (!(_k.sent()).length) return [3 /*break*/, 19];
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 17:
                    _h = __read.apply(void 0, [_k.sent(), 1]), _j = __read(_h[0], 2), messageTowardSip = _j[0], onSent = _j[1];
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
                        if (uas_1_1 && !uas_1_1.done && (_b = uas_1.return)) _b.call(uas_1);
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
        var e_4, _a, uaSimExt, _b, imsi, allowedUas, i, ua, _c, remainingUas, notAffectedUas, rows, rows_1, rows_1_1, row, ua;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, db.flush()];
                case 1:
                    _d.sent();
                    uaSimExt = {
                        "imsi": ttTesting.genDigits(15),
                        "ua": exports.generateUa()
                    };
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSimExt)];
                case 2:
                    _b.apply(void 0, [_d.sent(),
                        {
                            "isUaCreatedOrUpdated": true,
                            "isFirstUaForSim": true
                        }]);
                    imsi = ttTesting.genDigits(15);
                    allowedUas = [];
                    i = 0;
                    _d.label = 3;
                case 3:
                    if (!(i < 15)) return [3 /*break*/, 6];
                    ua = exports.generateUa();
                    if (allowedUas.length < 10) {
                        allowedUas.push(ua);
                    }
                    _c = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 4:
                    _c.apply(void 0, [_d.sent(),
                        {
                            "isUaCreatedOrUpdated": true,
                            "isFirstUaForSim": allowedUas.length === 1
                        }]);
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
                                "software": row["software"],
                                "messagesEnabled": sqliteCustom.bool.dec(row["messages_enabled"])
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
                            if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
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
        var e_5, _a, imsi, email, uas, i, ua, _b, missedCallNumber, uas_2, uas_2_1, ua, _c, _d, _e, messagesTowardSip, e_5_1;
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
                    ua = exports.generateUa((i % 4 === 0) ? email : undefined);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _b.apply(void 0, [_f.sent(),
                        {
                            "isFirstUaForSim": i === 0,
                            "isUaCreatedOrUpdated": true
                        }]);
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
                    _c = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 9:
                    _c.apply(void 0, [(_f.sent()).length,
                        1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _d = __read.apply(void 0, [_f.sent(), 1]), _e = __read(_d[0], 1), messagesTowardSip = _e[0];
                    assertSame(messagesTowardSip, {
                        "bundledData": {
                            "type": "MISSED CALL",
                            "date": messagesTowardSip.date
                        },
                        "date": messagesTowardSip.date,
                        "fromNumber": missedCallNumber,
                        "isFromDongle": false,
                        "text": "Missed call"
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
                        if (uas_2_1 && !uas_2_1.done && (_a = uas_2.return)) _a.call(uas_2);
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
        var e_6, _a, imsi, email, ringingUas, i, ua, _b, answeringUa, number, _c, _d, ua, _e, _f, _g, messagesTowardSip, e_6_1;
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
                    ua = exports.generateUa((i % 4 === 0) ? email : undefined);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _b.apply(void 0, [_h.sent(),
                        {
                            "isFirstUaForSim": i === 0,
                            "isUaCreatedOrUpdated": true
                        }]);
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
                    _c = __values(ringingUas.filter(function (_a) {
                        var userEmail = _a.userEmail;
                        return userEmail !== answeringUa.userEmail;
                    })), _d = _c.next();
                    _h.label = 8;
                case 8:
                    if (!!_d.done) return [3 /*break*/, 12];
                    ua = _d.value;
                    _e = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 9:
                    _e.apply(void 0, [(_h.sent()).length,
                        1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _f = __read.apply(void 0, [_h.sent(), 1]), _g = __read(_f[0], 1), messagesTowardSip = _g[0];
                    assertSame(messagesTowardSip, {
                        "bundledData": {
                            "type": "CALL ANSWERED BY",
                            "date": messagesTowardSip.date,
                            "ua": answeringUa
                        },
                        "date": messagesTowardSip.date,
                        "fromNumber": number,
                        "text": "Call answered by " + answeringUa.userEmail,
                        "isFromDongle": false
                    });
                    _h.label = 11;
                case 11:
                    _d = _c.next();
                    return [3 /*break*/, 8];
                case 12: return [3 /*break*/, 15];
                case 13:
                    e_6_1 = _h.sent();
                    e_6 = { error: e_6_1 };
                    return [3 /*break*/, 15];
                case 14:
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
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
if (require.main === module) {
    console.log("Run standalone");
    process.once("unhandledRejection", function (error) { throw error; });
    testDbSemasim().then(function () { return process.exit(0); });
}
