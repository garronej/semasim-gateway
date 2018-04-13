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
        let logger = socket.misc[enableLogging.miscKey] || {};
        let sipRequest = ApiMessage_1.ApiMessage.Request.buildSip(methodName, params);
        misc.buildNextHopPacket.pushVia(socket, sipRequest);
        let actionId = ApiMessage_1.ApiMessage.readActionId(sipRequest);
        let writeSuccess = yield socket.write(sipRequest);
        if (!writeSuccess) {
            if (!!logger.onRequestNotSent) {
                logger.onRequestNotSent(methodName, params, socket);
            }
            socket.destroy();
            throw new SendRequestError(methodName, params, "CANNOT SEND REQUEST");
        }
        let sipRequestResponse;
        let timeoutValue = extra.timeout || 5 * 60 * 1000;
        try {
            sipRequestResponse = yield Promise.race([
                socket.evtRequest.attachOnceExtract(sipRequestResponse => ApiMessage_1.ApiMessage.Response.matchSip(sipRequestResponse, actionId), timeoutValue, () => { }),
                new Promise((_, reject) => socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE"))))
            ]);
        }
        catch (error) {
            let sendRequestError = new SendRequestError(methodName, params, (error.message === "CLOSE") ?
                "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
            if (sendRequestError.cause === "REQUEST TIMEOUT") {
                if (!!logger.onRequestTimeout) {
                    logger.onRequestTimeout(methodName, params, timeoutValue, socket);
                }
                socket.destroy();
            }
            else {
                if (!!logger.onClosedConnection) {
                    logger.onClosedConnection(methodName, params, socket);
                }
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
            if (!!logger.onMalformedResponse) {
                logger.onMalformedResponse(methodName, params, misc.getPacketContent(sipRequestResponse), socket);
            }
            socket.destroy();
            throw sendRequestError;
        }
        return response;
    });
}
exports.sendRequest = sendRequest;
function enableLogging(socket, logger) {
    socket.misc[enableLogging.miscKey] = logger;
}
exports.enableLogging = enableLogging;
(function (enableLogging) {
    enableLogging.miscKey = "__api_client_logger__";
})(enableLogging = exports.enableLogging || (exports.enableLogging = {}));
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
function getDefaultLogger(options) {
    options = options || {};
    let idString = options.idString || "";
    let log = options.log || console.log;
    const base = (socket, methodName, params) => [
        `[ Sip API ${idString} call Error ]`.red,
        `${socket.localAddress}:${socket.localPort} (local)`,
        "=>",
        `${socket.remoteAddress}:${socket.remotePort} (remote)`,
        methodName,
        "\n",
        `params: ${JSON.stringify(params)}\n`,
    ].join(" ");
    return {
        "onRequestNotSent": (methodName, params, socket) => log(`${base(socket, methodName, params)}Request not sent`),
        "onClosedConnection": (methodName, params, socket) => log(`${base(socket, methodName, params)}Remote connection lost`),
        "onRequestTimeout": (methodName, params, timeoutValue, socket) => log(`${base(socket, methodName, params)}Request timeout after ${timeoutValue}ms`),
        "onMalformedResponse": (methodName, params, rawResponse, socket) => log(`${base(socket, methodName, params)}Malformed response\nrawResponse: ${rawResponse}`)
    };
}
exports.getDefaultLogger = getDefaultLogger;
