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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var framework = require("../tools/sipApiFramework");
var db = require("./db");
var _ = require("./sipApiClient");
var _debug = require("debug");
var debug = _debug("_sipApi");
function startListening(backendSocket) {
    var _this = this;
    framework.startListening(backendSocket).attach(function (_a) {
        var method = _a.method, params = _a.params, sendResponse = _a.sendResponse;
        return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug(method + ": params: " + JSON.stringify(params) + "...");
                        return [4 /*yield*/, handlers[method](params)];
                    case 1:
                        response = _a.sent();
                        debug("..." + method + ": response: " + JSON.stringify(response));
                        sendResponse(response);
                        return [2 /*return*/];
                }
            });
        });
    });
}
exports.startListening = startListening;
var handlers = {};
(function () {
    var methodName = _.isDongleConnected.methodName;
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var imei, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    imei = params.imei;
                    if (!chan_dongle_extended_client_1.DongleController.getInstance().dongles.has(imei)) return [3 /*break*/, 1];
                    return [2 /*return*/, { "isConnected": true }];
                case 1:
                    _a = {
                        "isConnected": false
                    };
                    _b = "lastConnection";
                    return [4 /*yield*/, db.semasim.getDonglesLastConnection()];
                case 2: return [2 /*return*/, (_a[_b] = (_c.sent()).get(imei),
                        _a)];
            }
        });
    }); };
})();
(function () {
    var methodName = _.unlockDongle.methodName;
    function checkIfIccidMatch(iccid, last_four_digits_of_iccid) {
        return iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }
    handlers[methodName] = function (params) { return __awaiter(_this, void 0, void 0, function () {
        var imei, last_four_digits_of_iccid, pin_first_try, pin_second_try, dc, dongle, activeDongle, _a, _b, pin, unlockResult, _c, e_1_1, _d, dongle_1, _e, e_1, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    imei = params.imei, last_four_digits_of_iccid = params.last_four_digits_of_iccid, pin_first_try = params.pin_first_try, pin_second_try = params.pin_second_try;
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    dongle = dc.dongles.get(imei);
                    if (!dongle) {
                        return [2 /*return*/, { "status": "ERROR", "message": "Dongle is not connected" }];
                    }
                    if (dongle.sim.iccid && checkIfIccidMatch(dongle.sim.iccid, last_four_digits_of_iccid)) {
                        return [2 /*return*/, { "status": "ERROR", "message": "Sim ICCID mismatch" }];
                    }
                    if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle)) return [3 /*break*/, 1];
                    activeDongle = dongle;
                    return [3 /*break*/, 14];
                case 1:
                    _g.trys.push([1, 9, 10, 11]);
                    _a = __values([pin_first_try, pin_second_try, undefined]), _b = _a.next();
                    _g.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 8];
                    pin = _b.value;
                    if (dongle.sim.pinState !== "SIM PIN" || dongle.sim.tryLeft === 1 || !pin) {
                        return [2 /*return*/, {
                                "status": "STILL LOCKED",
                                "pinState": dongle.sim.pinState,
                                "tryLeft": dongle.sim.tryLeft
                            }];
                    }
                    unlockResult = void 0;
                    _g.label = 3;
                case 3:
                    _g.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, dc.unlock(dongle.imei, pin)];
                case 4:
                    unlockResult = _g.sent();
                    return [3 /*break*/, 6];
                case 5:
                    _c = _g.sent();
                    return [2 /*return*/, { "status": "ERROR", "message": "dongle disconnect while unlocking" }];
                case 6:
                    if (unlockResult.success) {
                        return [3 /*break*/, 8];
                    }
                    else {
                        dongle.sim.pinState = unlockResult.pinState;
                        dongle.sim.tryLeft = unlockResult.tryLeft;
                    }
                    _g.label = 7;
                case 7:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_1_1 = _g.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 11:
                    _g.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, dc.dongles.evtSet.waitFor(function (_a) {
                            var _b = __read(_a, 1), dongle = _b[0];
                            return chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle) && dongle.imei === imei;
                        }, 45000)];
                case 12:
                    _d = __read.apply(void 0, [_g.sent(), 1]), dongle_1 = _d[0];
                    activeDongle = dongle_1;
                    return [3 /*break*/, 14];
                case 13:
                    _e = _g.sent();
                    return [2 /*return*/, { "status": "ERROR", "message": "Unlock success but dongle not found" }];
                case 14:
                    if (checkIfIccidMatch(activeDongle.sim.iccid, last_four_digits_of_iccid)) {
                        return [2 /*return*/, { "status": "ERROR", "message": "Sim have been unlocked but ICCID mismatch" }];
                    }
                    return [2 /*return*/, { "status": "SUCCESS", "dongle": activeDongle }];
            }
        });
    }); };
})();
