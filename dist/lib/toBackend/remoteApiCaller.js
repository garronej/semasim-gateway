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
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var apiDeclaration = require("../../sip_api_declarations/backendToGateway");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var backendConnection = require("../toBackend/connection");
var dbAsterisk = require("../dbAsterisk");
var dbSemasim = require("../dbSemasim");
var sipContactsMonitor = require("../sipContactsMonitor");
exports.notifySimOnline = (function () {
    var methodName = apiDeclaration.notifySimOnline.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function () {
            var imsi, replacementPassword, response, _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        imsi = dongle.sim.imsi;
                        replacementPassword = dbAsterisk.generateSipEndpointPassword();
                        _a = sendRequest;
                        _b = [methodName];
                        _c = {
                            imsi: imsi,
                            "storageDigest": dongle.sim.storage.digest
                        };
                        _d = "password";
                        return [4 /*yield*/, dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi)];
                    case 1:
                        _c[_d] = _f.sent(),
                            _c.replacementPassword = replacementPassword;
                        _e = "towardSimEncryptKeyStr";
                        return [4 /*yield*/, dbSemasim.getTowardSimKeys(imsi)];
                    case 2: return [4 /*yield*/, _a.apply(void 0, _b.concat([(_c[_e] = (_f.sent()).encryptKeyStr,
                                _c["simDongle"] = {
                                    "imei": dongle.imei,
                                    "isVoiceEnabled": dongle.isVoiceEnabled,
                                    "manufacturer": dongle.manufacturer,
                                    "model": dongle.model,
                                    "firmwareVersion": dongle.firmwareVersion
                                },
                                _c["isGsmConnectivityOk"] = dongle.isGsmConnectivityOk,
                                _c["cellSignalStrength"] = dongle.cellSignalStrength,
                                _c)])).catch(function () { return undefined; })];
                    case 3:
                        response = _f.sent();
                        if (!response) {
                            return [2 /*return*/];
                        }
                        switch (response.status) {
                            case "OK": break;
                            case "NOT REGISTERED":
                                sipContactsMonitor.discardContactsRegisteredToSim(imsi, "sim is no longer registered by any user");
                                dbSemasim.removeUaSim(imsi);
                                break;
                            case "REPLACE PASSWORD":
                                sipContactsMonitor.discardContactsRegisteredToSim(imsi, "need password renewal");
                                dbSemasim.removeUaSim(imsi, response.allowedUas);
                                dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi, replacementPassword);
                                break;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.notifyGsmConnectivityChange = (function () {
    var methodName = apiDeclaration.notifyGsmConnectivityChange.methodName;
    return function (imsi, isGsmConnectivityOk) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { imsi: imsi, isGsmConnectivityOk: isGsmConnectivityOk }).catch(function () { })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.notifyCellSignalStrengthChange = (function () {
    var methodName = apiDeclaration.notifyCellSignalStrengthChange.methodName;
    return function (imsi, cellSignalStrength) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { imsi: imsi, cellSignalStrength: cellSignalStrength }).catch(function () { })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.notifyLockedDongle = (function () {
    var methodName = apiDeclaration.notifyLockedDongle.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, dongle).catch(function () { })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.notifyDongleOffline = (function () {
    var methodName = apiDeclaration.notifyDongleOffline.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle) ?
                            { "imei": dongle.imei } :
                            { "imsi": dongle.sim.imsi }).catch(function () { })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.notifyOngoingCall = (function () {
    var methodName = apiDeclaration.notifyOngoingCall.methodName;
    return function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, params).catch(function () { })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.seeIfSipContactIsReachableElseSendWakeUpPushNotification = (function () {
    var methodName = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification.methodName;
    return function (contact) { return sendRequest(methodName, contact); };
})();
exports.sendWakeUpPushNotifications = (function () {
    var methodName = apiDeclaration.sendWakeUpPushNotifications.methodName;
    return function (_a) {
        var uas = _a.uas, imsi = _a.imsi;
        return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (uas.length === 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, sendRequest(methodName, { uas: uas, imsi: imsi }, "RETRY")];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
function sendRequest(methodName, params, retry) {
    if (retry === void 0) { retry = false; }
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    _b = (_a = sip.api.client).sendRequest;
                    return [4 /*yield*/, backendConnection.get()];
                case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(),
                        methodName,
                        params,
                        { "timeout": 5 * 1000 }])];
                case 2:
                    response = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    if (!!retry) {
                        //NOTE: Only retry once. If it's a connection problem
                        //this will likely be solved by resending the request,
                        //if there is really a problem with the request altho
                        //it should not happen as the client is supposed to be 
                        //always up to date let's not flood the backend.
                        return [2 /*return*/, sendRequest(methodName, params, false)];
                    }
                    else {
                        throw error_1;
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, response];
            }
        });
    });
}
