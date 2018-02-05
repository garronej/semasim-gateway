"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("../tools/sipLibrary");
const superJson = require("super-json");
var JSON;
(function (JSON) {
    const myJson = superJson.create({
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
    const actionIdKey = "api-action-id";
    function buildSip(actionId, payload) {
        let sipRequest = sip.parse([
            `API _ SIP/2.0`,
            "Max-Forwards: 1",
            "\r\n"
        ].join("\r\n"));
        //TODO: should be set to [] already :(
        sipRequest.headers.via = [];
        sipRequest.headers[actionIdKey] = `${actionId++}`;
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
        let payload = JSON.parse(sipRequest.content);
        console.assert(!sanityCheck || sanityCheck(payload));
        return payload;
    }
    ApiMessage.parsePayload = parsePayload;
    const methodNameKey = "method";
    let Request;
    (function (Request) {
        let actionIdCounter = 0;
        function buildSip(methodName, params) {
            let sipRequest = ApiMessage.buildSip(actionIdCounter++, params);
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
    let Response;
    (function (Response) {
        function buildSip(actionId, response) {
            let sipRequest = ApiMessage.buildSip(actionId, response);
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
const keepAliveMethodName = "keepAlive";
class Server {
    constructor(handlers, sanityChecks = {}) {
        this.handlers = handlers;
        this.sanityChecks = sanityChecks;
        this.handlers[keepAliveMethodName] = () => __awaiter(this, void 0, void 0, function* () { return "PONG"; });
    }
    startListening(socket) {
        socket.evtRequest.attachExtract(sipRequest => ApiMessage.Request.matchSip(sipRequest), (sipRequest) => __awaiter(this, void 0, void 0, function* () {
            let methodName = ApiMessage.Request.readMethodName(sipRequest);
            let params;
            try {
                params = ApiMessage.parsePayload(sipRequest, this.sanityChecks[methodName]);
            }
            catch (_a) {
                console.log("Api request malformed".red);
                socket.destroy();
                return;
            }
            //console.log("server", { methodName, params });
            let handler = this.handlers[methodName];
            if (!handler) {
                console.log(`Method ${methodName} not implemented`.red);
                socket.destroy();
                return;
            }
            let response;
            try {
                response = yield handler(params, socket);
            }
            catch (_b) {
                console.log("Request made handler throw error".red);
                socket.destroy();
                return;
            }
            //console.log("server", { response });
            let sipRequestResp = ApiMessage.Response.buildSip(ApiMessage.readActionId(sipRequest), response);
            socket.addViaHeader(sipRequestResp);
            socket.write(sipRequestResp);
        }));
    }
}
exports.Server = Server;
class Client {
    constructor(socket, keepAliveInterval = 120 * 1000, sanityChecks = {}) {
        this.socket = socket;
        this.keepAliveInterval = keepAliveInterval;
        this.sanityChecks = sanityChecks;
        socket.misc["apiClient"] = this;
        let timer = setInterval(() => this.sendRequest(keepAliveMethodName, "PING", 5 * 1000).catch(() => { }), keepAliveInterval);
        this.socket.evtClose.attach(() => clearInterval(timer));
    }
    static getFromSocket(socket) {
        let client = socket.misc["apiClient"];
        if (!client) {
            throw new Error("Api client not initialized on this socket");
        }
        return client;
    }
    sendRequest(methodName, params, timeout = 5 * 60 * 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            //console.log("client", { methodName, params });
            let sipRequest = ApiMessage.Request.buildSip(methodName, params);
            let actionId = ApiMessage.readActionId(sipRequest);
            this.socket.addViaHeader(sipRequest);
            let writeSuccess = yield this.socket.write(sipRequest);
            if (!writeSuccess) {
                throw new Client.SendRequestError(methodName, params, "CANNOT SEND REQUEST");
            }
            let sipRequestResponse;
            try {
                sipRequestResponse = yield Promise.race([
                    this.socket.evtRequest.attachOnceExtract(sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId), timeout, () => { }),
                    new Promise((_, reject) => this.socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE"))))
                ]);
            }
            catch (error) {
                let sendRequestError = new Client.SendRequestError(methodName, params, (error.message === "CLOSE") ?
                    "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
                if (sendRequestError.cause === "REQUEST TIMEOUT") {
                    console.log("Request timeout".red);
                    this.socket.destroy();
                }
                throw sendRequestError;
            }
            let response;
            try {
                response = ApiMessage.parsePayload(sipRequestResponse, this.sanityChecks[methodName]);
            }
            catch (_a) {
                let sendRequestError = new Client.SendRequestError(methodName, params, "MALFORMED RESPONSE");
                sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
                console.log("malformed response".red);
                this.socket.destroy();
                throw sendRequestError;
            }
            //console.log("client", { response });
            return response;
        });
    }
}
exports.Client = Client;
(function (Client) {
    class SendRequestError extends Error {
        constructor(methodName, params, cause) {
            super(`Send request ${methodName} ${cause}`);
            this.methodName = methodName;
            this.params = params;
            this.cause = cause;
            this.misc = {};
            Object.setPrototypeOf(this, new.target.prototype);
        }
    }
    Client.SendRequestError = SendRequestError;
})(Client = exports.Client || (exports.Client = {}));
