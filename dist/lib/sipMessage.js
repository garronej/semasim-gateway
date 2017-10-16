"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
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
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var sipProxy_1 = require("./sipProxy");
var sipLibrary = require("../tools/sipLibrary");
var _constants_1 = require("./_constants");
var phone = require("../tools/phoneNumberLibrary");
var _debug = require("debug");
var debug = _debug("_sipMessage");
var evtMessage = undefined;
function getEvtMessage() {
    var _this = this;
    if (evtMessage)
        return evtMessage;
    evtMessage = new ts_events_extended_1.SyncEvent();
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var ami, matchAllExt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleController.getInstance().ami;
                    matchAllExt = "_.";
                    return [4 /*yield*/, ami.dialplanExtensionRemove(matchAllExt, _constants_1.c.sipMessageContext)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ami.dialplanExtensionAdd(_constants_1.c.sipMessageContext, matchAllExt, 1, "Hangup")];
                case 2:
                    _a.sent();
                    sipProxy_1.evtIncomingMessage.attach(function (_a) {
                        var fromContact = _a.fromContact, sipRequest = _a.sipRequest;
                        var _b = utf8EncodedDataAsBinaryStringToString(sipRequest.content), isValidInput = _b.isValidInput, text = _b.text;
                        if (!isValidInput)
                            debug("Sip message content was not a valid UTF-8 string");
                        var toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user;
                        evtMessage.post({ fromContact: fromContact, toNumber: toNumber, text: text });
                    });
                    return [2 /*return*/];
            }
        });
    }); })();
    return evtMessage;
}
exports.getEvtMessage = getEvtMessage;
function sendMessage(contact, from_number, headers, text, from_number_sim_name) {
    return new Promise(function (resolve, reject) {
        var actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        var uri = contact.path.split(",")[0].match(/^<(.*)>$/)[1].replace(/;lr/, "");
        from_number = phone.toNationalNumber(from_number, contact.uaEndpoint.endpoint.sim.imsi);
        chan_dongle_extended_client_1.DongleController.getInstance().ami.messageSend("pjsip:" + contact.uaEndpoint.endpoint.dongle.imei + "/" + uri, from_number, actionId).catch(function (amiError) { return reject(amiError); });
        sipProxy_1.evtOutgoingMessage.attachOnce(function (_a) {
            var sipRequest = _a.sipRequest;
            return sipRequest.content === actionId;
        }, 2000, function (_a) {
            var sipRequest = _a.sipRequest, prSipResponse = _a.prSipResponse;
            if (from_number_sim_name)
                sipRequest.headers.from.name = "\"" + from_number_sim_name + " (sim)\"";
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.content = stringToUtf8EncodedDataAsBinaryString(text);
            sipRequest.headers = __assign({}, sipRequest.headers, headers);
            prSipResponse
                .then(function () { return resolve(); })
                .catch(function () { return reject(new Error("Not received")); });
        }).catch(function () { return reject(new Error("Not intercepted")); });
    });
}
exports.sendMessage = sendMessage;
function utf8EncodedDataAsBinaryStringToString(utf8EncodedDataAsBinaryString) {
    var uft8EncodedData = new Buffer(utf8EncodedDataAsBinaryString, "binary");
    var text = uft8EncodedData.toString("utf8");
    var isValidInput = uft8EncodedData.equals(new Buffer(text, "utf8"));
    return { isValidInput: isValidInput, text: text };
}
function stringToUtf8EncodedDataAsBinaryString(text) {
    return (new Buffer(text, "utf8")).toString("binary");
}
