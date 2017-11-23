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
Object.defineProperty(exports, "__esModule", { value: true });
var framework = require("../tools/sipApiFramework");
var sipProxy_1 = require("./sipProxy");
var _debug = require("debug");
var debug = _debug("_sipApiClientBackend");
function sendRequest(method, params) {
    return __awaiter(this, void 0, void 0, function () {
        var backendSocket, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sipProxy_1.getBackendSocket()];
                case 1:
                    backendSocket = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    debug(method + ": params: " + JSON.stringify(params).substring(0, 20) + "...");
                    return [4 /*yield*/, framework.sendRequest(backendSocket, method, params)];
                case 3:
                    response = _a.sent();
                    debug("..." + method + ": response: " + JSON.stringify(response));
                    return [2 /*return*/, response];
                case 4:
                    error_1 = _a.sent();
                    debug("Error sending request: " + error_1.message + ", retrying...");
                    return [2 /*return*/, sendRequest(method, params)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
var claimDongle;
(function (claimDongle) {
    claimDongle.methodName = "claimDongle";
    ;
    ;
    function makeCall(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var params, isGranted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = { imei: imei };
                        return [4 /*yield*/, sendRequest(claimDongle.methodName, params)];
                    case 1:
                        isGranted = (_a.sent()).isGranted;
                        return [2 /*return*/, isGranted];
                }
            });
        });
    }
    claimDongle.makeCall = makeCall;
})(claimDongle = exports.claimDongle || (exports.claimDongle = {}));
var wakeUpContact;
(function (wakeUpContact) {
    wakeUpContact.methodName = "wakeUpContact";
    function makeCall(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = { contact: contact };
                        return [4 /*yield*/, sendRequest(wakeUpContact.methodName, payload)];
                    case 1:
                        status = (_a.sent()).status;
                        return [2 /*return*/, status];
                }
            });
        });
    }
    wakeUpContact.makeCall = makeCall;
})(wakeUpContact = exports.wakeUpContact || (exports.wakeUpContact = {}));
var forceContactToReRegister;
(function (forceContactToReRegister) {
    forceContactToReRegister.methodName = "forceContactToReRegister";
    function makeCall(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, isPushNotificationSent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = { contact: contact };
                        return [4 /*yield*/, sendRequest(forceContactToReRegister.methodName, payload)];
                    case 1:
                        isPushNotificationSent = (_a.sent()).isPushNotificationSent;
                        return [2 /*return*/, isPushNotificationSent];
                }
            });
        });
    }
    forceContactToReRegister.makeCall = makeCall;
})(forceContactToReRegister = exports.forceContactToReRegister || (exports.forceContactToReRegister = {}));
//Here we can send only push infos.
var sendPushNotification;
(function (sendPushNotification) {
    sendPushNotification.methodName = "sendPushNotification";
    function makeCall(ua) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, isPushNotificationSent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = { ua: ua };
                        return [4 /*yield*/, sendRequest(sendPushNotification.methodName, payload)];
                    case 1:
                        isPushNotificationSent = (_a.sent()).isPushNotificationSent;
                        return [2 /*return*/, isPushNotificationSent];
                }
            });
        });
    }
    sendPushNotification.makeCall = makeCall;
})(sendPushNotification = exports.sendPushNotification || (exports.sendPushNotification = {}));
