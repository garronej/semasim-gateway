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
var assert = require("assert");
var db = require("../lib/dbSemasim");
var crypto = require("crypto");
var ttTesting = require("transfer-tools/dist/lib/testing");
var assertSame = ttTesting.assertSame;
var sqliteCustom = require("sqlite-custom");
var generateUa = function (email) {
    if (email === void 0) { email = ttTesting.genHexStr(10) + "@foo.com"; }
    return ({
        "instance": "\"<urn:uuid:" + ttTesting.genHexStr(30) + ">\"",
        "platform": Date.now() % 2 ? "android" : "iOS",
        "pushToken": ttTesting.genHexStr(60),
        "userEmail": email,
        "towardUserEncryptKeyStr": crypto.randomBytes(254).toString("binary"),
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
                    _a.apply(void 0, [_j.sent(),
                        {}]);
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 3:
                    _b.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": true }]);
                    _c = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 4:
                    _c.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": false }]);
                    uaSim.ua.pushToken = ttTesting.genHexStr(60);
                    _d = assertSame;
                    return [4 /*yield*/, db.addUaSim(uaSim)];
                case 5:
                    _d.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": true }]);
                    imsi2 = "123456789123456";
                    _e = assertSame;
                    return [4 /*yield*/, db.addUaSim({
                            "imsi": imsi2,
                            "ua": uaSim.ua
                        })];
                case 6:
                    _e.apply(void 0, [_j.sent(),
                        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": false }]);
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
                    _g.apply(void 0, [_j.sent(),
                        []]);
                    console.log("ADD UA PASS");
                    return [2 /*return*/];
            }
        });
    });
}
function t2() {
    return __awaiter(this, void 0, void 0, function () {
        var imsi, email, messagesTowardGsm, uas, i, ua, _a, sendingUa, i, message, _b, checkMark, crossMark, _loop_1;
        var _c;
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
                    ua = generateUa((i % 4 === 0) ? email : undefined);
                    _a = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 3:
                    _a.apply(void 0, [_d.sent(),
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
                        "dateTime": Date.now(),
                        "textB64": Buffer.from(ttTesting.genUtf8Str(300), "utf8").toString("base64"),
                        "toNumber": ttTesting.genDigits(10),
                        "uaSim": {
                            imsi: imsi,
                            "ua": sendingUa
                        },
                        "appendPromotionalMessage": Date.now() % 2 === 0
                    };
                    return [4 /*yield*/, db.onSipMessage(message.toNumber, Buffer.from(message.textB64, "base64").toString("utf8"), message.uaSim, new Date(message.dateTime), message.appendPromotionalMessage)];
                case 7:
                    _d.sent();
                    messagesTowardGsm.push(message);
                    _d.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 6];
                case 9:
                    _b = assertSame;
                    return [4 /*yield*/, db.lastMessageReceivedDateBySim()];
                case 10:
                    _b.apply(void 0, [_d.sent(), (_c = {},
                            _c[imsi] = new Date(0),
                            _c)]);
                    checkMark = Buffer.from("e29c94", "hex").toString("utf8");
                    crossMark = Buffer.from("e29d8c", "hex").toString("utf8");
                    _loop_1 = function () {
                        var _a, _b, messageTowardGsm, _c, onSent, onStatusReport, sendDate, statusReport, bundledData, __i, __in, _d, _e, ua, o, _f, _g, mts, setSent, e_1_1, _h, _j, ua, o, _k, _l, mts, setSent, e_2_1;
                        var e_1, _m, e_2, _o;
                        return __generator(this, function (_p) {
                            switch (_p.label) {
                                case 0:
                                    _a = assertSame;
                                    return [4 /*yield*/, db.getUnsentMessagesTowardGsm(imsi)];
                                case 1:
                                    _a.apply(void 0, [(_p.sent()).map(function (v) { return v[0]; }),
                                        messagesTowardGsm]);
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
                                                                "textB64": Buffer.from(sendDate ? checkMark : crossMark, "utf8").toString("base64")
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
                                        "textB64": Buffer.from(statusReport.isDelivered ?
                                            "" + checkMark + checkMark : crossMark, "utf8").toString("base64")
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
                                        "bundledData": __assign({}, bundledData, { "textB64": Buffer.from("Me: " + Buffer.from(messageTowardGsm.textB64, "base64").toString("utf8"), "utf8").toString("base64") })
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
                                        "bundledData": __assign({}, bundledData, { "textB64": Buffer.from(messageTowardGsm.uaSim.ua.userEmail + ": " + Buffer.from(messageTowardGsm.textB64, "base64").toString("utf8"), "utf8").toString("base64") })
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
                    _a.apply(void 0, [_k.sent(),
                        false]);
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
                    _b.apply(void 0, [_k.sent(),
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
                            "pduDateTime": pduDate.getTime(),
                            "textB64": Buffer.from(ttTesting.genUtf8Str(400), "utf8").toString("base64")
                        },
                        "dateTime": pduDate.getTime(),
                        "fromNumber": ttTesting.genDigits(10),
                        "isFromDongle": true,
                    };
                    _c = assertSame;
                    return [4 /*yield*/, db.onDongleMessage(messageTowardSip.fromNumber, Buffer.from(messageTowardSip.bundledData.textB64, "base64").toString("utf8"), new Date(messageTowardSip.dateTime), imsi)];
                case 8:
                    _c.apply(void 0, [_k.sent(),
                        true]);
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
                            .map(function (v) { return v[0]; }),
                        messagesTowardSip]);
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
                    _a.apply(void 0, [_d.sent(),
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
                    ua = generateUa();
                    if (allowedUas.length < 10) {
                        allowedUas.push(ua);
                    }
                    _b = assertSame;
                    return [4 /*yield*/, db.addUaSim({ imsi: imsi, ua: ua })];
                case 4:
                    _b.apply(void 0, [_d.sent(),
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
                                "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
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
        var imsi, email, uas, i, ua, _a, missedCallNumber, uas_2, uas_2_1, ua, _b, _c, _d, messagesTowardSip, e_5_1;
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
                    _a.apply(void 0, [_f.sent(),
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
                    _b = assertSame;
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 9:
                    _b.apply(void 0, [(_f.sent()).length,
                        1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _c = __read.apply(void 0, [_f.sent(), 1]), _d = __read(_c[0], 1), messagesTowardSip = _d[0];
                    assertSame(messagesTowardSip, {
                        "bundledData": {
                            "type": "MISSED CALL",
                            "dateTime": messagesTowardSip.dateTime,
                            "textB64": Buffer.from("Missed call", "utf8").toString("base64")
                        },
                        "dateTime": messagesTowardSip.dateTime,
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
        var imsi, email, ringingUas, i, ua, _a, answeringUa, number, _b, _c, ua, _d, _e, _f, messagesTowardSip, e_6_1;
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
                    _a.apply(void 0, [_h.sent(),
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
                    _d.apply(void 0, [(_h.sent()).length,
                        1]);
                    return [4 /*yield*/, db.getUnsentMessagesTowardSip({ imsi: imsi, ua: ua })];
                case 10:
                    _e = __read.apply(void 0, [_h.sent(), 1]), _f = __read(_e[0], 1), messagesTowardSip = _f[0];
                    assertSame(messagesTowardSip, {
                        "bundledData": {
                            "type": "CALL ANSWERED BY",
                            "dateTime": messagesTowardSip.dateTime,
                            "ua": answeringUa,
                            "textB64": Buffer.from("Call answered by " + answeringUa.userEmail, "utf8").toString("base64")
                        },
                        "dateTime": messagesTowardSip.dateTime,
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
if (require.main === module) {
    console.log("Run standalone");
    process.once("unhandledRejection", function (error) { throw error; });
    testDbSemasim().then(function () { return process.exit(0); });
}
