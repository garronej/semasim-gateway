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
var phone = require("../tools/phoneNumberLibrary");
var sipApiBackend = require("./sipApiClientBackend");
var db = require("./db");
var sipProxy = require("./sipProxy");
var sipMessage = require("./sipMessage");
var messageQueue = require("./messageQueue");
var voiceCallBridge = require("./voiceCallBridge");
var _debug = require("debug");
var debug = _debug("_main");
debug("Starting semasim gateway !");
var dc = chan_dongle_extended_client_1.DongleController.getInstance();
dc.dongles.evtSet.attachPrepend(function (_a) {
    var _b = __read(_a, 1), dongle = _b[0];
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle)) return [3 /*break*/, 2];
                    return [4 /*yield*/, onNewActiveDongle(dongle)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, db.semasim.addDongle(dongle)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    sipApiBackend.claimDongle.makeCall(dongle.imei);
                    return [2 /*return*/];
            }
        });
    });
});
dc.evtMessage.attach(function (_a) {
    var dongle = _a.dongle, message = _a.message;
    return __awaiter(_this, void 0, void 0, function () {
        var endpoint;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("FROM DONGLE MESSAGE", { message: message });
                    endpoint = {
                        "dongle": {
                            "imei": dongle.imei
                        },
                        "sim": {
                            "iccid": dongle.sim.iccid
                        }
                    };
                    return [4 /*yield*/, db.semasim.MessageTowardSip.add(message.number, message.text, message.date, false, {
                            "is": "ALL UA_ENDPOINT OF ENDPOINT",
                            endpoint: endpoint
                        })];
                case 1:
                    _a.sent();
                    messageQueue.notifyNewSipMessagesToSend(endpoint);
                    return [2 /*return*/];
            }
        });
    });
});
db.asterisk.getEvtNewContact().attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
    var _a, isNewUa, isFirstUaEndpointOfEndpoint;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                debug("New contact: " + contact.pretty);
                return [4 /*yield*/, db.semasim.addUaEndpoint(contact.uaEndpoint)];
            case 1:
                _a = _b.sent(), isNewUa = _a.isNewUa, isFirstUaEndpointOfEndpoint = _a.isFirstUaEndpointOfEndpoint;
                if (!isFirstUaEndpointOfEndpoint) return [3 /*break*/, 3];
                return [4 /*yield*/, (function retrieveGsmMessageAlreadyReceived() {
                        return __awaiter(this, void 0, void 0, function () {
                            var imei, iccid, messages, messages_1, messages_1_1, message, e_1, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        imei = contact.uaEndpoint.endpoint.dongle.imei;
                                        iccid = contact.uaEndpoint.endpoint.sim.iccid;
                                        return [4 /*yield*/, dc.getMessages({ "flush": true, imei: imei, iccid: iccid })];
                                    case 1:
                                        messages = (_b.sent())[imei][iccid];
                                        try {
                                            for (messages_1 = __values(messages), messages_1_1 = messages_1.next(); !messages_1_1.done; messages_1_1 = messages_1.next()) {
                                                message = messages_1_1.value;
                                                db.semasim.MessageTowardSip.add(message.number, message.text, message.date, false, {
                                                    "is": "ALL UA_ENDPOINT OF ENDPOINT",
                                                    "endpoint": { "dongle": { imei: imei }, "sim": { iccid: iccid } }
                                                });
                                            }
                                        }
                                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                        finally {
                                            try {
                                                if (messages_1_1 && !messages_1_1.done && (_a = messages_1.return)) _a.call(messages_1);
                                            }
                                            finally { if (e_1) throw e_1.error; }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        });
                    })()];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                messageQueue.sendMessagesOfContact(contact);
                return [2 /*return*/];
        }
    });
}); });
sipMessage.getEvtMessage().attach(function (_a) {
    var fromContact = _a.fromContact, toNumber = _a.toNumber, text = _a.text;
    return __awaiter(_this, void 0, void 0, function () {
        var uaEndpoint;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("FROM SIP MESSAGE", { toNumber: toNumber, text: text });
                    uaEndpoint = fromContact.uaEndpoint;
                    return [4 /*yield*/, db.semasim.MessageTowardGsm.add(toNumber, text, uaEndpoint)];
                case 1:
                    _a.sent();
                    messageQueue.sendMessagesOfDongle(uaEndpoint.endpoint);
                    return [2 /*return*/];
            }
        });
    });
});
function onNewActiveDongle(dongle) {
    return __awaiter(this, void 0, void 0, function () {
        var imei, iccid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("onNewActiveDongle");
                    (function leveragePhoneNumberLib(dongle) {
                        var contacts = [];
                        try {
                            for (var _a = __values(dongle.sim.phonebook.contacts), _b = _a.next(); !_b.done; _b = _a.next()) {
                                var contact = _b.value;
                                if (!contact.name || !contact.number)
                                    continue;
                                contact.number = phone.toNationalNumber(contact.number, dongle.sim.imsi);
                                contacts.push(contact);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        dongle.sim.phonebook.contacts = contacts;
                        if (dongle.sim.number) {
                            dongle.sim.number = phone.toNationalNumber(dongle.sim.number, dongle.sim.imsi);
                        }
                        var imsiInfos = phone.getImsiInfos(dongle.sim.imsi);
                        if (imsiInfos) {
                            dongle.sim.serviceProvider = imsiInfos.network_name;
                        }
                        var e_2, _c;
                    })(dongle);
                    return [4 /*yield*/, db.semasim.addEndpoint(dongle)];
                case 1:
                    _a.sent();
                    imei = dongle.imei;
                    iccid = dongle.sim.iccid;
                    return [4 /*yield*/, db.asterisk.addEndpoint(imei, iccid)];
                case 2:
                    _a.sent();
                    messageQueue.sendMessagesOfDongle({ "dongle": { imei: imei }, "sim": { iccid: iccid } });
                    return [2 /*return*/];
            }
        });
    });
}
(function initializeActiveDonglesAndStartProxy() {
    return __awaiter(this, void 0, void 0, function () {
        var tasks, _a, _b, dongle, e_3, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    tasks = [];
                    tasks = [db.asterisk.flushContacts()];
                    tasks[tasks.length] = (function retrieveGsmMessageReceivedWhileDown() {
                        return __awaiter(this, void 0, void 0, function () {
                            var _this = this;
                            var tasks, _loop_1, _a, _b, endpoint, e_4_1, e_4, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        tasks = [];
                                        _loop_1 = function (endpoint) {
                                            tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                                                var fromDate, imei, iccid, messages, tasks, _a, _b, message, e_5, _c;
                                                return __generator(this, function (_d) {
                                                    switch (_d.label) {
                                                        case 0: return [4 /*yield*/, db.semasim.lastGsmMessageReceived(endpoint)];
                                                        case 1:
                                                            fromDate = _d.sent();
                                                            if (!fromDate)
                                                                return [2 /*return*/];
                                                            imei = endpoint.dongle.imei;
                                                            iccid = endpoint.sim.iccid;
                                                            return [4 /*yield*/, dc.getMessages({
                                                                    imei: imei, iccid: iccid, fromDate: fromDate, "flush": true
                                                                })];
                                                        case 2:
                                                            messages = _d.sent();
                                                            tasks = [];
                                                            try {
                                                                for (_a = __values(messages[imei][iccid]), _b = _a.next(); !_b.done; _b = _a.next()) {
                                                                    message = _b.value;
                                                                    tasks[tasks.length] = db.semasim.MessageTowardSip.add(message.number, message.text, message.date, false, {
                                                                        "is": "ALL UA_ENDPOINT OF ENDPOINT",
                                                                        "endpoint": endpoint
                                                                    });
                                                                }
                                                            }
                                                            catch (e_5_1) { e_5 = { error: e_5_1 }; }
                                                            finally {
                                                                try {
                                                                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                                                }
                                                                finally { if (e_5) throw e_5.error; }
                                                            }
                                                            return [4 /*yield*/, Promise.all(tasks)];
                                                        case 3:
                                                            _d.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })();
                                        };
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 6, 7, 8]);
                                        return [4 /*yield*/, db.semasim.getEndpoints()];
                                    case 2:
                                        _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                                        _d.label = 3;
                                    case 3:
                                        if (!!_b.done) return [3 /*break*/, 5];
                                        endpoint = _b.value;
                                        _loop_1(endpoint);
                                        _d.label = 4;
                                    case 4:
                                        _b = _a.next();
                                        return [3 /*break*/, 3];
                                    case 5: return [3 /*break*/, 8];
                                    case 6:
                                        e_4_1 = _d.sent();
                                        e_4 = { error: e_4_1 };
                                        return [3 /*break*/, 8];
                                    case 7:
                                        try {
                                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                        }
                                        finally { if (e_4) throw e_4.error; }
                                        return [7 /*endfinally*/];
                                    case 8: return [4 /*yield*/, Promise.all(tasks)];
                                    case 9:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    })();
                    try {
                        for (_a = __values(dc.activeDongles.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                            dongle = _b.value;
                            tasks.push(onNewActiveDongle(dongle));
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return [4 /*yield*/, tasks];
                case 1:
                    _d.sent();
                    sipProxy.start();
                    return [2 /*return*/];
            }
        });
    });
})();
voiceCallBridge.start();
