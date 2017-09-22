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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var framework = require("../tools/sipApiFramework");
var db_1 = require("./db");
var phone = require("../tools/phoneNumberLibrary");
var _ = require("./sipApiClient");
var _debug = require("debug");
var debug = _debug("_sipApi");
function startListening(backendSocket) {
    var _this = this;
    framework.startListening(backendSocket).attach(function (_a) {
        var method = _a.method, params = _a.params, sendResponse = _a.sendResponse;
        return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = sendResponse;
                    return [4 /*yield*/, handlers[method](params)];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        }); });
    });
}
exports.startListening = startListening;
var handlers = {};
(function () {
    var methodName = _.isDongleConnected.methodName;
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var imei, isConnected, lastConnectionTimestamp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    imei = params.imei;
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getConnectedDongles()];
                case 1:
                    isConnected = (_a.sent()).indexOf(imei) >= 0;
                    return [4 /*yield*/, db_1.asterisk.queryLastConnectionTimestampOfDonglesEndpoint(imei)];
                case 2:
                    lastConnectionTimestamp = _a.sent();
                    return [2 /*return*/, { isConnected: isConnected, lastConnectionTimestamp: lastConnectionTimestamp }];
            }
        });
    }); };
})();
(function () {
    var methodName = _.doesDongleHasSim.methodName;
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var imei, last_four_digits_of_iccid, dongleClient, dongle, lockedDongle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName, params);
                    imei = params.imei, last_four_digits_of_iccid = params.last_four_digits_of_iccid;
                    dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
                    return [4 /*yield*/, dongleClient.getActiveDongle(imei)];
                case 1:
                    dongle = _a.sent();
                    if (dongle &&
                        (dongle.iccid.substring(dongle.iccid.length - 4) === last_four_digits_of_iccid))
                        return [2 /*return*/, { "value": true }];
                    return [4 /*yield*/, dongleClient.getLockedDongles()];
                case 2:
                    lockedDongle = (_a.sent()).filter(function (d) { return d.imei === imei; }).pop();
                    if (!lockedDongle)
                        return [2 /*return*/, { "value": false }];
                    if (lockedDongle.iccid.substring(lockedDongle.iccid.length - 4) === last_four_digits_of_iccid)
                        return [2 /*return*/, { "value": true }];
                    else
                        return [2 /*return*/, { "value": "MAYBE" }];
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = _.unlockDongle.methodName;
    function checkIfIccidMatch(iccid, last_four_digits_of_iccid) {
        return !iccid || iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }
    function readServiceProvider(spFromDongle, imsi) {
        var imsiInfos = phone.getImsiInfos(imsi);
        if (!imsiInfos)
            return spFromDongle;
        return imsiInfos.network_name;
    }
    function buildSuccessResponse(dongle) {
        return {
            "dongleFound": true,
            "pinState": "READY",
            "iccid": dongle.iccid,
            "number": phone.toNationalNumber(dongle.number || "", dongle.imsi),
            "serviceProvider": readServiceProvider(dongle.serviceProvider, dongle.imsi)
        };
    }
    function buildDongleStillLockedResponse(dongle) {
        return {
            "dongleFound": true,
            "pinState": dongle.pinState,
            "tryLeft": dongle.tryLeft
        };
    }
    function attemptUnlock(imei, pin) {
        return __awaiter(this, void 0, void 0, function () {
            var dongleClient;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Attempt unlock " + imei + ", pin: " + pin);
                        dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
                        return [4 /*yield*/, dongleClient.unlockDongle(imei, pin)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Promise.race([
                                dongleClient.evtNewActiveDongle.waitFor(function (newActiveDongle) { return newActiveDongle.imei === imei; }),
                                dongleClient.evtRequestUnlockCode.waitFor(function (lockedDongle) { return lockedDongle.imei === imei; })
                            ])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
    ;
    var matchUnlocked = function (dongle) { return !dongle.pinState; };
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var imei, last_four_digits_of_iccid, pin_first_try, pin_second_try, dongleClient, activeDongle, lockedDongle, lockedDongles, i, dongleFirstTry, dongleSecondTry, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    imei = params.imei, last_four_digits_of_iccid = params.last_four_digits_of_iccid, pin_first_try = params.pin_first_try, pin_second_try = params.pin_second_try;
                    dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, dongleClient.getActiveDongle(imei)];
                case 2:
                    activeDongle = _a.sent();
                    if (activeDongle) {
                        if (!checkIfIccidMatch(activeDongle.iccid, last_four_digits_of_iccid))
                            throw new Error("ICCID does not match");
                        return [2 /*return*/, buildSuccessResponse(activeDongle)];
                    }
                    lockedDongle = undefined;
                    return [4 /*yield*/, dongleClient.getLockedDongles()];
                case 3:
                    lockedDongles = _a.sent();
                    for (i = 0; i < lockedDongles.length; i++) {
                        if (lockedDongles[i].imei !== imei)
                            continue;
                        if (!checkIfIccidMatch(lockedDongles[i].iccid, last_four_digits_of_iccid))
                            continue;
                        lockedDongle = lockedDongles[i];
                        break;
                    }
                    if (!lockedDongle)
                        throw new Error("Locked dongle not found");
                    if (lockedDongle.pinState !== "SIM PIN" || lockedDongle.tryLeft === 1 || !pin_first_try)
                        return [2 /*return*/, buildDongleStillLockedResponse(lockedDongle)];
                    return [4 /*yield*/, attemptUnlock(imei, pin_first_try)];
                case 4:
                    dongleFirstTry = _a.sent();
                    if (matchUnlocked(dongleFirstTry))
                        return [2 /*return*/, buildSuccessResponse(dongleFirstTry)];
                    if (dongleFirstTry.tryLeft === 1 || !pin_second_try)
                        return [2 /*return*/, buildDongleStillLockedResponse(dongleFirstTry)];
                    return [4 /*yield*/, attemptUnlock(imei, pin_second_try)];
                case 5:
                    dongleSecondTry = _a.sent();
                    if (matchUnlocked(dongleSecondTry))
                        return [2 /*return*/, buildSuccessResponse(dongleSecondTry)];
                    return [2 /*return*/, buildDongleStillLockedResponse(dongleSecondTry)];
                case 6:
                    error_1 = _a.sent();
                    debug("error: ", error_1.message);
                    return [2 /*return*/, { "dongleFound": false }];
                case 7: return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = _.getSimPhonebook.methodName;
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var iccid, dongleClient, _a, _b, imei, imsi, phonebook, _c, _d, contact, error_2, e_1, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    debug("handle " + methodName);
                    iccid = params.iccid;
                    dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, dongleClient.getActiveDongles()];
                case 2:
                    _a = __read.apply(void 0, [(_f.sent())
                            .filter(function (dongle) { return dongle.iccid === iccid; })
                            .map(function (_a) {
                            var imei = _a.imei, imsi = _a.imsi;
                            return ({ imei: imei, imsi: imsi });
                        }), 1]), _b = _a[0], imei = _b.imei, imsi = _b.imsi;
                    return [4 /*yield*/, dongleClient.getSimPhonebook(imei)];
                case 3:
                    phonebook = _f.sent();
                    try {
                        for (_c = __values(phonebook.contacts), _d = _c.next(); !_d.done; _d = _c.next()) {
                            contact = _d.value;
                            if (!contact.name || !contact.number)
                                continue;
                            contact.number = phone.toNationalNumber(contact.number, imsi);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/, phonebook];
                case 4:
                    error_2 = _f.sent();
                    return [2 /*return*/, { "errorMessage": error_2.message }];
                case 5: return [2 /*return*/];
            }
        });
    }); };
})();
