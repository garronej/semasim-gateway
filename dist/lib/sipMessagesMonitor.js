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
exports.handleAsteriskSocket = exports.init = exports.sendMessage = exports.evtMessage = exports.dialplanContext = void 0;
var evt_1 = require("evt");
var ts_ami_1 = require("ts-ami");
var sipLibrary = require("ts-sip");
var bundledData_1 = require("./misc/bundledData");
var cryptoLib = require("crypto-lib");
var dbSemasim = require("./dbSemasim");
var workerThreadPoolId_1 = require("./misc/workerThreadPoolId");
var crypto = require("crypto");
exports.dialplanContext = "from-sip-message";
exports.evtMessage = new evt_1.Evt();
function sendMessage(contact, fromNumber, headers) {
    return new Promise(function (resolve, reject) {
        var actionId = ts_ami_1.Ami.generateUniqueActionId();
        var uri = (function () {
            var parsedUri = sipLibrary.parsePath(contact.path)[0].uri;
            delete parsedUri.params["lr"];
            return sipLibrary.stringifyUri(parsedUri);
        })();
        ts_ami_1.Ami.getInstance().messageSend("pjsip:" + contact.uaSim.imsi + "/" + uri, fromNumber, actionId).catch(function (amiError) { return reject(amiError); });
        sendMessage.evtOutgoingMessage.attachOnce(function (_a) {
            var sipRequest = _a.sipRequest;
            return sipLibrary.getPacketContent(sipRequest).toString("utf8") === actionId;
        }, 2000, function (_a) {
            var sipRequest = _a.sipRequest, prSipResponse = _a.prSipResponse;
            sipRequest.headers.route = sipLibrary.parsePath(contact.path);
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.headers = __assign(__assign({}, sipRequest.headers), headers);
            //NOTE: We make so that the text of the SIP message is unique.
            //( required by Semasim android. )
            sipLibrary.setPacketContent(sipRequest, "| Message payload encrypted in headers | headers-digest: " +
                crypto.createHash("sha1")
                    .update(Buffer.from(JSON.stringify(sipRequest.headers), "utf8"))
                    .digest()
                    .toString("base64"));
            prSipResponse
                .then(function () { return resolve(); })
                .catch(function () { return reject(new Error("Not received")); });
        }).catch(function () { return reject(new Error("Not intercepted")); });
    });
}
exports.sendMessage = sendMessage;
(function (sendMessage) {
    sendMessage.evtOutgoingMessage = new evt_1.Evt();
})(sendMessage = exports.sendMessage || (exports.sendMessage = {}));
//From here functions are not exported outside sipProxy
/**
 * Must be called before the first connection to backend
 * and after Ami have been instantiated.
 * */
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var ami, matchAllExt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ami = ts_ami_1.Ami.getInstance();
                    matchAllExt = "_.";
                    return [4 /*yield*/, ami.dialplanExtensionRemove(matchAllExt, exports.dialplanContext)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ami.dialplanExtensionAdd(exports.dialplanContext, matchAllExt, 1, "Hangup")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
/**
 * Should be called against every new asterisk socket
 * as soon as it is created.
 * prContact should resolve to the sipContact
 * associated to the socket.
 *  */
function handleAsteriskSocket(asteriskSocket, prContact) {
    var _this = this;
    asteriskSocket.evtRequest.attachPrepend(sipLibrary.isPlainMessageRequest, function (sipRequestAsReceived) {
        return onOutgoingSipMessage(sipRequestAsReceived, asteriskSocket.evtPacketPreWrite.waitFor(function (sipPacketNextHop) { return (!sipLibrary.matchRequest(sipPacketNextHop) &&
            sipLibrary.isResponse(sipRequestAsReceived, sipPacketNextHop)); }, 5000));
    });
    asteriskSocket.evtPacketPreWrite.attach(function (sipPacketNextHop) { return (sipLibrary.matchRequest(sipPacketNextHop) &&
        sipLibrary.isPlainMessageRequest(sipPacketNextHop, "WITH AUTH")); }, function (sipRequestNextHop) { return asteriskSocket.evtResponse.attachOnce(function (sipResponse) { return sipLibrary.isResponse(sipRequestNextHop, sipResponse); }, function (_a) {
        var status = _a.status;
        return __awaiter(_this, void 0, void 0, function () {
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (status !== 202) {
                            return [2 /*return*/];
                        }
                        _b = onIncomingSipMessage;
                        return [4 /*yield*/, prContact];
                    case 1:
                        _b.apply(void 0, [_c.sent(), sipRequestNextHop]);
                        return [2 /*return*/];
                }
            });
        });
    }); });
}
exports.handleAsteriskSocket = handleAsteriskSocket;
/**
 * Need to be called when a SIP MESSAGE packet is emitted by asterisk.
 *
 * @param sipRequestAsReceived Must be the sipRequest as sent by asterisk.
 * This calling this method will cause the message to be updated.
 * Even if the received packet should never be altered by the sipProxy
 * it is ok in this case as this module act as a middleware between Asterisk and
 * the semasim gateway.
 * @param prSipResponse promise that resolve if a response is received from UA or reject
 * if no response have been received in a reasonable amount of time.
 *
 */
function onOutgoingSipMessage(sipRequestAsReceived, prSipResponse) {
    sendMessage.evtOutgoingMessage.post({
        "sipRequest": sipRequestAsReceived,
        prSipResponse: prSipResponse
    });
}
/**
 *
 * Must be called when we received from backend a SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain.
 *
 * @param fromContact the contact the message come from
 * @param sipRequest the MESSAGE sipRequest
 * the message will not be modified.
 *
 */
function onIncomingSipMessage(fromContact, sipRequest) {
    return __awaiter(this, void 0, void 0, function () {
        var decryptor, _a, _b, _c, _d;
        var _this = this;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                        var prDecryptorMap, imsi, prDecryptor;
                        return __generator(this, function (_a) {
                            prDecryptorMap = onIncomingSipMessage.prDecryptorMap;
                            imsi = fromContact.uaSim.imsi;
                            prDecryptor = prDecryptorMap.get(imsi);
                            if (prDecryptor === undefined) {
                                prDecryptor = dbSemasim.getTowardSimKeys(imsi)
                                    .then(function (towardSimKeysStr) { return cryptoLib.rsa.decryptorFactory(cryptoLib.RsaKey.parse(towardSimKeysStr.decryptKeyStr), workerThreadPoolId_1.workerThreadPoolId); });
                                prDecryptorMap.set(imsi, prDecryptor);
                            }
                            return [2 /*return*/, prDecryptor];
                        });
                    }); })()];
                case 1:
                    decryptor = _e.sent();
                    _b = (_a = exports.evtMessage).post;
                    _c = {
                        fromContact: fromContact,
                        "toNumber": sipLibrary.parseUri(sipRequest.headers.to.uri).user
                    };
                    _d = "bundledData";
                    return [4 /*yield*/, bundledData_1.extractBundledDataFromHeaders(sipRequest.headers, decryptor)];
                case 2:
                    _b.apply(_a, [(_c[_d] = _e.sent(),
                            _c)]);
                    return [2 /*return*/];
            }
        });
    });
}
(function (onIncomingSipMessage) {
    onIncomingSipMessage.prDecryptorMap = new Map();
})(onIncomingSipMessage || (onIncomingSipMessage = {}));
