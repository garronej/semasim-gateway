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
const misc = require("../misc");
const ApiMessage_1 = require("./ApiMessage");
class Client {
    /** Must be called once the socket has connected */
    constructor(socket, keepAliveInterval = 120 * 1000) {
        this.socket = socket;
        this.keepAliveInterval = keepAliveInterval;
        socket.misc["__apiClient__"] = this;
        (() => {
            const methodName = ApiMessage_1.keepAlive.methodName;
            const timeout = ApiMessage_1.keepAlive.timeout;
            const sanityCheck = ApiMessage_1.keepAlive.Response.sanityCheck;
            //TODO await connect before send
            let timer = setInterval(() => this.sendRequest(methodName, "PING", { timeout, sanityCheck }), keepAliveInterval);
            this.socket.evtClose.attachOnce(() => clearInterval(timer));
        })();
    }
    static getFromSocket(socket) {
        let client = socket.misc["__apiClient__"];
        if (!client) {
            throw new Error("Api client not initialized on this socket");
        }
        return client;
    }
    sendRequest(methodName, params, extra = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let sipRequest = ApiMessage_1.ApiMessage.Request.buildSip(methodName, params);
            misc.buildNextHopPacket.pushVia(this.socket, sipRequest);
            let actionId = ApiMessage_1.ApiMessage.readActionId(sipRequest);
            let writeSuccess = yield this.socket.write(sipRequest);
            if (!writeSuccess) {
                throw new Client.SendRequestError(methodName, params, "CANNOT SEND REQUEST");
            }
            let sipRequestResponse;
            try {
                sipRequestResponse = yield Promise.race([
                    this.socket.evtRequest.attachOnceExtract(sipRequestResponse => ApiMessage_1.ApiMessage.Response.matchSip(sipRequestResponse, actionId), extra.timeout || 5 * 60 * 1000, () => { }),
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
                response = ApiMessage_1.ApiMessage.parsePayload(sipRequestResponse, extra.sanityCheck);
            }
            catch (_a) {
                let sendRequestError = new Client.SendRequestError(methodName, params, "MALFORMED RESPONSE");
                sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
                console.log("malformed response".red);
                this.socket.destroy();
                throw sendRequestError;
            }
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
