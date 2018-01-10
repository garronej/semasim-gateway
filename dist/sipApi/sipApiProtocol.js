"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var sip = require("../tools/sipLibrary");
var superJson = require("super-json");
var JSON;
(function (JSON) {
    var myJson = superJson.create({
        "magic": '#!',
        "serializers": [
            superJson.dateSerializer
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
    var actionIdKey = "api-action-id";
    function buildSip(actionId, payload) {
        var sipRequest = sip.parse([
            "API _ SIP/2.0",
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
        return (!!sipRequest.headers &&
            !isNaN(parseInt(sipRequest.headers[actionIdKey])));
    }
    ApiMessage.matchSip = matchSip;
    function readActionId(sipRequest) {
        return parseInt(sipRequest.headers[actionIdKey]);
    }
    ApiMessage.readActionId = readActionId;
    function parsePayload(sipRequest, sanityCheck) {
        var payload = JSON.parse(sipRequest.content);
        console.assert(!sanityCheck || sanityCheck(payload));
        return payload;
    }
    ApiMessage.parsePayload = parsePayload;
    var methodNameKey = "method";
    var Request;
    (function (Request) {
        var actionIdCounter = 0;
        function buildSip(methodName, params) {
            var sipRequest = ApiMessage.buildSip(actionIdCounter++, params);
            sipRequest.headers[methodNameKey] = methodName;
            return sipRequest;
        }
        Request.buildSip = buildSip;
        function matchSip(sipRequest) {
            return (ApiMessage.matchSip(sipRequest) &&
                !!sipRequest.headers[methodNameKey]);
        }
        Request.matchSip = matchSip;
        function readMethodName(sipRequest) {
            return sipRequest.headers[methodNameKey];
        }
        Request.readMethodName = readMethodName;
    })(Request = ApiMessage.Request || (ApiMessage.Request = {}));
    var Response;
    (function (Response) {
        function buildSip(actionId, response) {
            var sipRequest = ApiMessage.buildSip(actionId, response);
            return sipRequest;
        }
        Response.buildSip = buildSip;
        function matchSip(sipRequest, actionId) {
            return (ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodNameKey] === undefined &&
                ApiMessage.readActionId(sipRequest) === actionId);
        }
        Response.matchSip = matchSip;
    })(Response = ApiMessage.Response || (ApiMessage.Response = {}));
})(ApiMessage || (ApiMessage = {}));
var keepAliveMethodName = "keepAlive";
var Server = /** @class */ (function () {
    function Server(handlers, sanityChecks) {
        if (sanityChecks === void 0) { sanityChecks = {}; }
        var _this = this;
        this.handlers = handlers;
        this.sanityChecks = sanityChecks;
        this.handlers[keepAliveMethodName] = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, "PONG"];
        }); }); };
    }
    Server.prototype.startListening = function (socket) {
        var _this = this;
        socket.evtRequest.attachExtract(function (sipRequest) { return ApiMessage.Request.matchSip(sipRequest); }, function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
            var methodName, params, handler, response, _a, sipRequestResp;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        methodName = ApiMessage.Request.readMethodName(sipRequest);
                        try {
                            params = ApiMessage.parsePayload(sipRequest, this.sanityChecks[methodName]);
                        }
                        catch (_c) {
                            console.log("Api request malformed");
                            socket.destroy();
                            return [2 /*return*/];
                        }
                        console.log("server", { methodName: methodName, params: params });
                        handler = this.handlers[methodName];
                        if (!handler) {
                            console.log("Method " + methodName + " not implemented");
                            socket.destroy();
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(params, socket)];
                    case 2:
                        response = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        console.log("Request made handler throw error");
                        socket.destroy();
                        return [2 /*return*/];
                    case 4:
                        console.log("server", { response: response });
                        sipRequestResp = ApiMessage.Response.buildSip(ApiMessage.readActionId(sipRequest), response);
                        socket.addViaHeader(sipRequestResp);
                        socket.write(sipRequestResp);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return Server;
}());
exports.Server = Server;
var Client = /** @class */ (function () {
    function Client(socket, keepAliveInterval, sanityChecks) {
        if (keepAliveInterval === void 0) { keepAliveInterval = 120 * 1000; }
        if (sanityChecks === void 0) { sanityChecks = {}; }
        var _this = this;
        this.socket = socket;
        this.keepAliveInterval = keepAliveInterval;
        this.sanityChecks = sanityChecks;
        socket.misc["apiClient"] = this;
        var timer = setInterval(function () {
            return _this.sendRequest(keepAliveMethodName, "PING", 5 * 1000);
        }, keepAliveInterval);
        this.socket.evtClose.attach(function () { return clearInterval(timer); });
    }
    Client.getFromSocket = function (socket) {
        var client = socket.misc["apiClient"];
        if (!client) {
            throw new Error("Api client not initialized on this socket");
        }
        return client;
    };
    Client.prototype.sendRequest = function (methodName, params, timeout) {
        if (timeout === void 0) { timeout = 5 * 60 * 1000; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sipRequest, actionId, writeSuccess, sipRequestResponse, error_1, sendRequestError, response, sendRequestError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("client", { methodName: methodName, params: params });
                        sipRequest = ApiMessage.Request.buildSip(methodName, params);
                        actionId = ApiMessage.readActionId(sipRequest);
                        this.socket.addViaHeader(sipRequest);
                        return [4 /*yield*/, this.socket.write(sipRequest)];
                    case 1:
                        writeSuccess = _a.sent();
                        if (!writeSuccess) {
                            throw new Client.SendRequestError(methodName, params, "CANNOT SEND REQUEST");
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Promise.race([
                                this.socket.evtRequest.attachOnceExtract(function (sipRequestResponse) { return ApiMessage.Response.matchSip(sipRequestResponse, actionId); }, timeout, function () { }),
                                new Promise(function (_, reject) { return _this.socket.evtClose.attachOnce(sipRequest, function () { return reject(new Error("CLOSE")); }); })
                            ])];
                    case 3:
                        sipRequestResponse = _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        sendRequestError = new Client.SendRequestError(methodName, params, (error_1.message === "CLOSE") ?
                            "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
                        if (sendRequestError.cause === "REQUEST TIMEOUT") {
                            console.log("Request timeout");
                            this.socket.destroy();
                        }
                        throw sendRequestError;
                    case 5:
                        try {
                            response = ApiMessage.parsePayload(sipRequestResponse, this.sanityChecks[methodName]);
                        }
                        catch (_b) {
                            sendRequestError = new Client.SendRequestError(methodName, params, "MALFORMED RESPONSE");
                            sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
                            console.log("malformed response");
                            this.socket.destroy();
                            throw sendRequestError;
                        }
                        console.log("client", { response: response });
                        return [2 /*return*/, response];
                }
            });
        });
    };
    return Client;
}());
exports.Client = Client;
(function (Client) {
    var SendRequestError = /** @class */ (function (_super) {
        __extends(SendRequestError, _super);
        function SendRequestError(methodName, params, cause) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, "Send request " + methodName + " " + cause) || this;
            _this.methodName = methodName;
            _this.params = params;
            _this.cause = cause;
            _this.misc = {};
            Object.setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        return SendRequestError;
    }(Error));
    Client.SendRequestError = SendRequestError;
})(Client = exports.Client || (exports.Client = {}));
exports.Client = Client;
