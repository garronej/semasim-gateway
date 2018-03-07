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
function sendRequest(socket, methodName, params, extra = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        let sipRequest = ApiMessage_1.ApiMessage.Request.buildSip(methodName, params);
        misc.buildNextHopPacket.pushVia(socket, sipRequest);
        let actionId = ApiMessage_1.ApiMessage.readActionId(sipRequest);
        let writeSuccess = yield socket.write(sipRequest);
        if (!writeSuccess) {
            throw new SendRequestError(methodName, params, "CANNOT SEND REQUEST");
        }
        let sipRequestResponse;
        try {
            sipRequestResponse = yield Promise.race([
                socket.evtRequest.attachOnceExtract(sipRequestResponse => ApiMessage_1.ApiMessage.Response.matchSip(sipRequestResponse, actionId), extra.timeout || 5 * 60 * 1000, () => { }),
                new Promise((_, reject) => socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE"))))
            ]);
        }
        catch (error) {
            let sendRequestError = new SendRequestError(methodName, params, (error.message === "CLOSE") ?
                "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
            if (sendRequestError.cause === "REQUEST TIMEOUT") {
                console.log("Request timeout".red);
                socket.destroy();
            }
            throw sendRequestError;
        }
        let response;
        try {
            response = ApiMessage_1.ApiMessage.parsePayload(sipRequestResponse, extra.sanityCheck);
        }
        catch (_a) {
            let sendRequestError = new SendRequestError(methodName, params, "MALFORMED RESPONSE");
            sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
            console.log("malformed response".red);
            socket.destroy();
            throw sendRequestError;
        }
        return response;
    });
}
exports.sendRequest = sendRequest;
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
exports.SendRequestError = SendRequestError;
function enableKeepAlive(socket, interval = 120 * 1000) {
    const methodName = ApiMessage_1.keepAlive.methodName;
    (() => __awaiter(this, void 0, void 0, function* () {
        if (!socket.evtConnect.postCount) {
            yield socket.evtConnect.waitFor();
        }
        while (true) {
            try {
                yield sendRequest(socket, methodName, "PING", {
                    "timeout": 5 * 1000,
                    "sanityCheck": response => response === "PONG"
                });
            }
            catch (_a) {
                break;
            }
            try {
                yield socket.evtClose.waitFor(interval);
                break;
            }
            catch (_b) { }
        }
    }))();
}
exports.enableKeepAlive = enableKeepAlive;
