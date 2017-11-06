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
var ts_events_extended_1 = require("ts-events-extended");
var sip = require("./sipLibrary");
var superJson = require("super-json");
var JSON;
(function (JSON) {
    var myJson = superJson.create({
        "magic": '#!',
        "serializers": [
            superJson.dateSerializer,
        ]
    });
    function stringify(obj) {
        if (obj === undefined) {
            return "undefined";
        }
        return myJson.stringify([obj]);
    }
    JSON.stringify = stringify;
    function parse(str) {
        if (str === "undefined") {
            return undefined;
        }
        return myJson.parse(str).pop();
    }
    JSON.parse = parse;
})(JSON || (JSON = {}));
var ApiMessage;
(function (ApiMessage) {
    var sipMethod = "API";
    var actionIdKey = "action-id";
    var methodKey = "method";
    function buildSip(actionId, payload) {
        var sipRequest = sip.parse([
            sipMethod + " _ SIP/2.0",
            "Max-Forwards: 1",
            "\r\n"
        ].join("\r\n"));
        //TODO: should be set to [] already :(
        sipRequest.headers.via = [];
        sipRequest.headers[actionIdKey] = "" + actionId++;
        sipRequest.content = JSON.stringify(payload);
        return sipRequest;
    }
    ApiMessage.buildSip = buildSip;
    function matchSip(sipRequest) {
        return sipRequest.method === sipMethod;
    }
    ApiMessage.matchSip = matchSip;
    function readActionId(sipRequest) {
        return parseInt(sipRequest.headers[actionIdKey]);
    }
    ApiMessage.readActionId = readActionId;
    function parsePayload(sipRequest) {
        return JSON.parse(sipRequest.content);
    }
    ApiMessage.parsePayload = parsePayload;
    var Request;
    (function (Request) {
        var actionIdCounter = 0;
        function buildSip(method, payload) {
            var sipRequest = ApiMessage.buildSip(actionIdCounter++, payload);
            sipRequest.headers[methodKey] = method;
            return sipRequest;
        }
        Request.buildSip = buildSip;
        function matchSip(sipRequest) {
            try {
                return (ApiMessage.matchSip(sipRequest) &&
                    sipRequest.headers[methodKey]);
            }
            catch (_a) {
                return false;
            }
        }
        Request.matchSip = matchSip;
        function readMethod(sipRequest) {
            return sipRequest.headers[methodKey];
        }
        Request.readMethod = readMethod;
    })(Request = ApiMessage.Request || (ApiMessage.Request = {}));
    var Response;
    (function (Response) {
        function buildSip(actionId, payload) {
            var sipRequest = ApiMessage.buildSip(actionId, payload);
            return sipRequest;
        }
        Response.buildSip = buildSip;
        function matchSip(sipRequest, actionId) {
            try {
                return (ApiMessage.matchSip(sipRequest) &&
                    sipRequest.headers[methodKey] === undefined &&
                    ApiMessage.readActionId(sipRequest) === actionId);
            }
            catch (_a) {
                return false;
            }
        }
        Response.matchSip = matchSip;
    })(Response = ApiMessage.Response || (ApiMessage.Response = {}));
})(ApiMessage || (ApiMessage = {}));
function startListening(sipSocket) {
    var evt = new ts_events_extended_1.SyncEvent();
    sipSocket.evtRequest.attachExtract(function (sipRequest) { return ApiMessage.Request.matchSip(sipRequest); }, function (sipRequest) {
        var actionId;
        var method;
        var params;
        try {
            actionId = ApiMessage.readActionId(sipRequest);
            method = ApiMessage.Request.readMethod(sipRequest);
            params = ApiMessage.parsePayload(sipRequest);
            if (typeof actionId !== "number" || isNaN(actionId)) {
                throw Error();
            }
            if (typeof method !== "string") {
                throw Error();
            }
        }
        catch (_a) {
            console.log("Remote api bad message");
            return;
        }
        var sendResponse = function (response) {
            var sipRequest = ApiMessage.Response.buildSip(actionId, response);
            //TODO: test!
            sipSocket.addViaHeader(sipRequest);
            sipSocket.write(sipRequest);
        };
        evt.post({ method: method, params: params, sendResponse: sendResponse });
    });
    return evt;
}
exports.startListening = startListening;
exports.errorSendRequest = {
    "timeout": "Timeout, No response in allowed delay",
    "writeFailed": "Can't send request, write error",
    "sockedCloseBeforeResponse": "Socket has been closed before receiving response",
    "malformedResponse": "Body response could not be parsed"
};
function sendRequest(sipSocket, method, params, timeout) {
    if (timeout === void 0) { timeout = 5 * 60 * 1000; }
    return __awaiter(this, void 0, void 0, function () {
        var sipRequest, actionId, success, sipRequestResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sipRequest = ApiMessage.Request.buildSip(method, params);
                    actionId = ApiMessage.readActionId(sipRequest);
                    sipSocket.addViaHeader(sipRequest);
                    success = sipSocket.write(sipRequest);
                    if (!success)
                        throw new Error(exports.errorSendRequest.writeFailed);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.race([
                            sipSocket.evtRequest.attachOnceExtract(function (sipRequestResponse) { return ApiMessage.Response.matchSip(sipRequestResponse, actionId); }, timeout, function () { }),
                            new Promise(function (_, reject) { return sipSocket.evtClose.attachOnce(sipRequest, reject); })
                        ])];
                case 2:
                    sipRequestResponse = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (typeof error_1 === "boolean") {
                        throw new Error(exports.errorSendRequest.sockedCloseBeforeResponse);
                    }
                    else {
                        throw new Error(exports.errorSendRequest.timeout);
                    }
                    return [3 /*break*/, 4];
                case 4:
                    try {
                        return [2 /*return*/, ApiMessage.parsePayload(sipRequestResponse)];
                    }
                    catch (_b) {
                        throw new Error(exports.errorSendRequest.malformedResponse);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.sendRequest = sendRequest;
