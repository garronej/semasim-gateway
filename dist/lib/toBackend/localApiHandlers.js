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
exports.handlers = void 0;
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var apiDeclaration = require("../../sip_api_declarations/gatewayToBackend");
var remoteApi = require("./remoteApiCaller");
var dbAsterisk = require("../dbAsterisk");
var dbSemasim = require("../dbSemasim");
exports.handlers = {};
{
    var methodName = apiDeclaration.getDongle.methodName;
    var handler = {
        "handler": function (_a) {
            var imei = _a.imei;
            return Promise.resolve(chan_dongle_extended_client_1.DongleController.getInstance().dongles.get(imei));
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(void 0, void 0, void 0, function () {
                var dongle, _b, sipPassword, towardSimEncryptKeyStr;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            dongle = Array.from(chan_dongle_extended_client_1.DongleController.getInstance().dongles.values())
                                .filter(chan_dongle_extended_client_1.types.Dongle.Usable.match)
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (!dongle) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, Promise.all([
                                    dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi),
                                    dbSemasim.getTowardSimKeys(imsi).then(function (out) { return out; })
                                ])];
                        case 1:
                            _b = __read.apply(void 0, [_c.sent(), 2]), sipPassword = _b[0], towardSimEncryptKeyStr = _b[1].encryptKeyStr;
                            return [2 /*return*/, { dongle: dongle, sipPassword: sipPassword, towardSimEncryptKeyStr: towardSimEncryptKeyStr }];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.unlockSim.methodName;
    var handler = {
        "handler": function (_a) {
            var imei = _a.imei, pin = _a.pin;
            return __awaiter(void 0, void 0, void 0, function () {
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleController.getInstance().unlock(imei, pin)];
                        case 1: return [2 /*return*/, _c.sent()];
                        case 2:
                            _b = _c.sent();
                            return [2 /*return*/, undefined];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.rebootDongle.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(void 0, void 0, void 0, function () {
                var dc, dongle, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            dc = chan_dongle_extended_client_1.DongleController.getInstance();
                            dongle = Array.from(dc.usableDongles.values()).find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (!dongle) {
                                return [2 /*return*/, { "isSuccess": false }];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleController.getInstance().rebootDongle(dongle.imei)];
                        case 2:
                            _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _c.sent();
                            return [2 /*return*/, { "isSuccess": false }];
                        case 4: return [2 /*return*/, { "isSuccess": true }];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.reNotifySimOnline.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(void 0, void 0, void 0, function () {
                var dc, dongle;
                return __generator(this, function (_b) {
                    dc = chan_dongle_extended_client_1.DongleController.getInstance();
                    dongle = Array.from(dc.usableDongles.values())
                        .find(function (_a) {
                        var sim = _a.sim;
                        return sim.imsi === imsi;
                    });
                    if (dongle) {
                        remoteApi.notifySimOnline(dongle);
                    }
                    return [2 /*return*/, undefined];
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.createContact.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, name = _a.name, number = _a.number;
            return __awaiter(void 0, void 0, void 0, function () {
                var dc, dongle, contact, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            dc = chan_dongle_extended_client_1.DongleController.getInstance();
                            dongle = Array.from(dc.usableDongles.values())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (!dongle) {
                                return [2 /*return*/, undefined];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, dc.createContact(imsi, number, name)];
                        case 2:
                            contact = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _c.sent();
                            return [2 /*return*/, undefined];
                        case 4: return [2 /*return*/, {
                                "mem_index": contact.index,
                                "name_as_stored": contact.name,
                                "new_storage_digest": dongle.sim.storage.digest
                            }];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.updateContactName.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, mem_index = _a.mem_index, newName = _a.newName;
            return __awaiter(void 0, void 0, void 0, function () {
                var dc, dongle, contact, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            dc = chan_dongle_extended_client_1.DongleController.getInstance();
                            dongle = Array.from(dc.usableDongles.values())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (!dongle) {
                                return [2 /*return*/, undefined];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, dc.updateContact(imsi, mem_index, newName, undefined)];
                        case 2:
                            contact = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _c.sent();
                            return [2 /*return*/, undefined];
                        case 4: return [2 /*return*/, {
                                "new_name_as_stored": contact.name,
                                "new_storage_digest": dongle.sim.storage.digest
                            }];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.deleteContact.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, mem_index = _a.mem_index;
            return __awaiter(void 0, void 0, void 0, function () {
                var dc, dongle, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            dc = chan_dongle_extended_client_1.DongleController.getInstance();
                            dongle = Array.from(dc.usableDongles.values())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (!dongle) {
                                return [2 /*return*/, undefined];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, dc.deleteContact(imsi, mem_index)];
                        case 2:
                            _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _c.sent();
                            return [2 /*return*/, undefined];
                        case 4: return [2 /*return*/, { "new_storage_digest": dongle.sim.storage.digest }];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
