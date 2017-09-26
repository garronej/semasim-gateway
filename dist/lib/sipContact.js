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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var sipLibrary = require("../tools/sipLibrary");
var db = require("./db");
var sipProxy_1 = require("./sipProxy");
var sipApiBackend = require("./sipApiClientBackend");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_sipContact");
var PsContact;
(function (PsContact) {
    function buildUserAgentFieldValue(instanceId, userAgent) {
        var wrap = { instanceId: instanceId, userAgent: userAgent };
        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64");
    }
    PsContact.buildUserAgentFieldValue = buildUserAgentFieldValue;
    function decodeUserAgentFieldValue(psContact) {
        return JSON.parse((new Buffer(psContact.user_agent, "base64")).toString("utf8"));
    }
    function readFlowToken(psContact) {
        return sipLibrary.parsePath(psContact.path).pop().uri.params[_constants_1.c.shared.flowTokenKey];
    }
    function extractPushInfos(psContact) {
        var params = sipLibrary.parseUri(psContact.uri).params;
        var pushType = params["pn-type"] || undefined;
        var pushToken = params["pn-tok"] || undefined;
        return { pushType: pushType, pushToken: pushToken };
    }
    function buildContact(psContact) {
        psContact.uri = psContact.uri.replace(/\^3B/g, ";");
        psContact.path = psContact.path.replace(/\^3B/g, ";");
        var _a = decodeUserAgentFieldValue(psContact), instanceId = _a.instanceId, userAgent = _a.userAgent;
        var flowToken = readFlowToken(psContact);
        var pushInfos = extractPushInfos(psContact);
        var pretty = [
            "imei: " + psContact.endpoint,
            "+sip.instance: " + instanceId,
            "flowToken: " + flowToken
        ].join(",");
        return {
            "ps": psContact,
            pushInfos: pushInfos,
            "uaInstance": {
                "dongle_imei": psContact.endpoint,
                "instance_id": instanceId
            },
            userAgent: userAgent,
            flowToken: flowToken,
            pretty: pretty
        };
    }
    PsContact.buildContact = buildContact;
})(PsContact = exports.PsContact || (exports.PsContact = {}));
var Contact;
(function (Contact) {
    function buildDialString(contacts) {
        var dialStringSplit = [];
        try {
            for (var contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                var ps = contacts_1_1.value.ps;
                dialStringSplit.push("PJSIP/" + ps.endpoint + "/" + ps.uri);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return dialStringSplit.join("&");
        var e_1, _a;
    }
    Contact.buildDialString = buildDialString;
    function getContactOfFlow(flowToken) {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var returned, contacts, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        returned = false;
                        getEvtNewContact().waitFor(function (contact) { return contact.flowToken === flowToken; }, 1200).then(function (contact) {
                            if (returned)
                                return;
                            returned = true;
                            resolve(contact);
                        }).catch(function () {
                            if (returned)
                                return;
                            returned = true;
                            resolve(undefined);
                        });
                        return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 1:
                        contacts = _a.sent();
                        if (returned)
                            return [2 /*return*/];
                        contact = contacts.find(function (contact) { return contact.flowToken === flowToken; });
                        if (!contact)
                            return [2 /*return*/];
                        returned = true;
                        resolve(contact);
                        return [2 /*return*/];
                }
            });
        }); });
    }
    Contact.getContactOfFlow = getContactOfFlow;
    function wakeUpAllContacts(endpoint, getResultTimeout) {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var reachableContacts, unreachableContacts, _a, resolver, timeoutId, tasks, _loop_1, unreachableContacts_1, unreachableContacts_1_1, contact, e_2, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        reachableContacts = new Set();
                        _a = Set.bind;
                        return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 1:
                        unreachableContacts = new (_a.apply(Set, [void 0, (_c.sent()).filter(function (contact) { return contact.ps.endpoint === endpoint; })]))();
                        resolver = function () {
                            resolve({ reachableContacts: reachableContacts, unreachableContacts: unreachableContacts });
                            reachableContacts = new Set();
                            unreachableContacts = new Set();
                        };
                        timeoutId = setTimeout(function () {
                            if (!reachableContacts.size)
                                return;
                            resolver();
                        }, getResultTimeout || 9000);
                        tasks = [];
                        _loop_1 = function (contact) {
                            tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a, reachableContact, error_1;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, sipApiBackend.wakeUpUserAgent.makeCall(contact)];
                                        case 1:
                                            _a = _b.sent();
                                            switch (_a) {
                                                case "REACHABLE": return [3 /*break*/, 2];
                                                case "PUSH_NOTIFICATION_SENT": return [3 /*break*/, 3];
                                            }
                                            return [3 /*break*/, 6];
                                        case 2:
                                            unreachableContacts.delete(contact);
                                            reachableContacts.add(contact);
                                            return [2 /*return*/];
                                        case 3:
                                            _b.trys.push([3, 5, , 6]);
                                            return [4 /*yield*/, getEvtNewContact().waitFor(function (reRegisteredContact) {
                                                    return JSON.stringify(reRegisteredContact.uaInstance) === JSON.stringify(contact.uaInstance);
                                                }, 15000)];
                                        case 4:
                                            reachableContact = _b.sent();
                                            unreachableContacts.delete(contact);
                                            reachableContacts.add(reachableContact);
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_1 = _b.sent();
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); })();
                        };
                        try {
                            for (unreachableContacts_1 = __values(unreachableContacts), unreachableContacts_1_1 = unreachableContacts_1.next(); !unreachableContacts_1_1.done; unreachableContacts_1_1 = unreachableContacts_1.next()) {
                                contact = unreachableContacts_1_1.value;
                                _loop_1(contact);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (unreachableContacts_1_1 && !unreachableContacts_1_1.done && (_b = unreachableContacts_1.return)) _b.call(unreachableContacts_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        return [4 /*yield*/, Promise.all(tasks)];
                    case 2:
                        _c.sent();
                        clearTimeout(timeoutId);
                        resolver();
                        return [2 /*return*/];
                }
            });
        }); });
    }
    Contact.wakeUpAllContacts = wakeUpAllContacts;
    var evtNewContact = undefined;
    function getEvtNewContact() {
        var _this = this;
        if (evtNewContact)
            return evtNewContact;
        evtNewContact = new ts_events_extended_1.SyncEvent();
        db.asterisk.getEvtNewContact().attach(function (newContact) { return __awaiter(_this, void 0, void 0, function () {
            var oldContact, oldAsteriskSocket;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 1:
                        oldContact = (_a.sent()).find(function (oldContact) { return (oldContact.ps.id !== newContact.ps.id &&
                            JSON.stringify(oldContact.uaInstance) === JSON.stringify(newContact.uaInstance)); });
                        if (!oldContact) return [3 /*break*/, 4];
                        debug("We overwrite contact " + oldContact.pretty);
                        return [4 /*yield*/, db.asterisk.deleteContact(oldContact)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, sipProxy_1.getAsteriskSockets()];
                    case 3:
                        oldAsteriskSocket = (_a.sent()).get(oldContact.flowToken);
                        if (oldAsteriskSocket)
                            oldAsteriskSocket.destroy();
                        _a.label = 4;
                    case 4:
                        evtNewContact.post(newContact);
                        return [2 /*return*/];
                }
            });
        }); });
        return evtNewContact;
    }
    Contact.getEvtNewContact = getEvtNewContact;
    var evtExpiredContact = undefined;
    function getEvtExpiredContact() {
        var _this = this;
        if (evtExpiredContact)
            return evtExpiredContact;
        evtExpiredContact = new ts_events_extended_1.SyncEvent();
        db.asterisk.getEvtExpiredContact().attach(function (expiredContact) { return __awaiter(_this, void 0, void 0, function () {
            var asteriskSocket;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sipProxy_1.getAsteriskSockets()];
                    case 1:
                        asteriskSocket = (_a.sent()).get(expiredContact.flowToken);
                        if (asteriskSocket)
                            asteriskSocket.destroy();
                        evtExpiredContact.post(expiredContact);
                        return [2 /*return*/];
                }
            });
        }); });
        return evtExpiredContact;
    }
    Contact.getEvtExpiredContact = getEvtExpiredContact;
})(Contact = exports.Contact || (exports.Contact = {}));
