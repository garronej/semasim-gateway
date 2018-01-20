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
var sipApi_1 = require("../sipApi");
var sipProxy_1 = require("./sipProxy");
var db = require("./db");
function init(backendSocket) {
    new sipApi_1.protocol.Client(backendSocket);
}
exports.init = init;
function getClient() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = sipApi_1.protocol.Client).getFromSocket;
                    return [4 /*yield*/, sipProxy_1.getBackendSocket()];
                case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
            }
        });
    });
}
function sendRequest(methodName, params, retry) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, getClient()];
                case 1: return [4 /*yield*/, (_a.sent()).sendRequest(methodName, params, 5 * 1000)];
                case 2:
                    response = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (retry) {
                        return [2 /*return*/, sendRequest(methodName, params, "RETRY")];
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
function notifySimOnline(dongle) {
    var _this = this;
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var methodName, params, _a, _b, response, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    methodName = sipApi_1.backendDeclaration.notifySimOnline.methodName;
                    _a = {
                        "imsi": dongle.sim.imsi,
                        "isVoiceEnabled": dongle.isVoiceEnabled,
                        "storageDigest": dongle.sim.storage.digest
                    };
                    _b = "password";
                    return [4 /*yield*/, db.asterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi)];
                case 1:
                    params = (_a[_b] = _e.sent(),
                        _a);
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, sendRequest(methodName, params)];
                case 3:
                    response = _e.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _c = _e.sent();
                    return [2 /*return*/];
                case 5:
                    if (!(response.status === "NEED PASSWORD RENEWAL")) return [3 /*break*/, 7];
                    db.semasim.removeUaSim(dongle.sim.imsi, response.allowedUas);
                    _d = params;
                    return [4 /*yield*/, db.asterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi, "RENEW PASSWORD")];
                case 6:
                    _d.password = _e.sent();
                    sendRequest(methodName, params).catch(function () { });
                    return [3 /*break*/, 8];
                case 7:
                    if (response.status === "NOT REGISTERED") {
                        db.semasim.removeUaSim(dongle.sim.imsi);
                    }
                    _e.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    }); })();
}
exports.notifySimOnline = notifySimOnline;
function notifySimOffline(imsi) {
    var methodName = sipApi_1.backendDeclaration.notifySimOffline.methodName;
    var params = { imsi: imsi };
    sendRequest(methodName, params).catch(function () { });
}
exports.notifySimOffline = notifySimOffline;
//TODO: to remove ua should be added on connection
function notifyNewOrUpdatedUa(ua) {
    var methodName = sipApi_1.backendDeclaration.notifyNewOrUpdatedUa.methodName;
    var params = ua;
    sendRequest(methodName, params).catch(function () { });
}
exports.notifyNewOrUpdatedUa = notifyNewOrUpdatedUa;
function wakeUpContact(contact) {
    var methodName = sipApi_1.backendDeclaration.wakeUpContact.methodName;
    var params = { contact: contact };
    return sendRequest(methodName, params, "RETRY");
}
exports.wakeUpContact = wakeUpContact;
function forceContactToRegister(contact) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, params;
        return __generator(this, function (_a) {
            methodName = sipApi_1.backendDeclaration.forceContactToReRegister.methodName;
            params = { contact: contact };
            return [2 /*return*/, sendRequest(methodName, params, "RETRY")];
        });
    });
}
exports.forceContactToRegister = forceContactToRegister;
