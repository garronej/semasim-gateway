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
require("colors");
class Server {
    constructor(handlers, logger = {}) {
        this.handlers = handlers;
        this.logger = logger;
        (() => {
            const methodName = ApiMessage_1.keepAlive.methodName;
            let handler = {
                "sanityCheck": params => params === "PING",
                "handler": () => __awaiter(this, void 0, void 0, function* () { return "PONG"; })
            };
            this.handlers[methodName] = handler;
        })();
    }
    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    startListening(socket) {
        socket.evtRequest.attachExtract(sipRequest => ApiMessage_1.ApiMessage.Request.matchSip(sipRequest), (sipRequest) => __awaiter(this, void 0, void 0, function* () {
            let rsvDate = new Date();
            let methodName = ApiMessage_1.ApiMessage.Request.readMethodName(sipRequest);
            try {
                var { handler, sanityCheck } = this.handlers[methodName];
            }
            catch (_a) {
                if (!!this.logger.onMethodNotImplemented) {
                    this.logger.onMethodNotImplemented(methodName, socket);
                }
                socket.destroy();
                return;
            }
            let params;
            try {
                params = ApiMessage_1.ApiMessage.parsePayload(sipRequest, sanityCheck);
            }
            catch (_b) {
                if (!!this.logger.onRequestMalformed) {
                    this.logger.onRequestMalformed(methodName, misc.getPacketContent(sipRequest), socket);
                }
                socket.destroy();
                return;
            }
            let response;
            try {
                response = yield handler(params, socket);
            }
            catch (error) {
                if (!!this.logger.onHandlerThrowError) {
                    this.logger.onHandlerThrowError(methodName, params, error, socket);
                }
                socket.destroy();
                return;
            }
            let sipRequestResp;
            try {
                sipRequestResp = ApiMessage_1.ApiMessage.Response.buildSip(ApiMessage_1.ApiMessage.readActionId(sipRequest), response);
            }
            catch (_c) {
                if (!!this.logger.onHandlerReturnNonStringifiableResponse) {
                    this.logger.onHandlerReturnNonStringifiableResponse(methodName, params, response, socket);
                }
                socket.destroy();
                return;
            }
            if (!!this.logger.onRequestSuccessfullyHandled) {
                this.logger.onRequestSuccessfullyHandled(methodName, params, response, socket, rsvDate);
            }
            misc.buildNextHopPacket.pushVia(socket, sipRequestResp);
            socket.write(sipRequestResp);
        }));
    }
}
exports.Server = Server;
(function (Server) {
    function getDefaultLogger(options) {
        options = options || {};
        let idString = options.idString || "";
        let log = options.log || console.log;
        let displayOnlyErrors = options.displayOnlyErrors || false;
        let hideKeepAlive = options.hideKeepAlive || false;
        const base = (socket, methodName, isError, date = new Date()) => [
            `${date.getHours()}h ${date.getMinutes()}m ${date.getSeconds()}s ${date.getMilliseconds()}ms`,
            isError ? `[ Sip API ${idString} Handler Error ]`.red : `[ Sip API ${idString} Handler ]`.green,
            `${socket.localAddress}:${socket.localPort} (local)`,
            "<=",
            `${socket.remoteAddress}:${socket.remotePort} (remote)`,
            methodName.yellow,
            "\n"
        ].join(" ");
        return {
            "onMethodNotImplemented": (methodName, socket) => log(`${base(socket, methodName, true)}Not implemented`),
            "onRequestMalformed": (methodName, rawParams, socket) => log(`${base(socket, methodName, true)}Request malformed`, { "rawParams": `${rawParams}` }),
            "onHandlerThrowError": (methodName, params, error, socket) => log(`${base(socket, methodName, true)}Handler throw error`, error),
            "onHandlerReturnNonStringifiableResponse": (methodName, params, response, socket) => log(`${base(socket, methodName, true)}Non stringifiable resp`, { response }),
            "onRequestSuccessfullyHandled": (methodName, params, response, socket, rsvDate) => {
                if (displayOnlyErrors) {
                    return;
                }
                if (hideKeepAlive && ApiMessage_1.keepAlive.methodName === methodName) {
                    return;
                }
                log([
                    base(socket, methodName, false, rsvDate),
                    `${"---Params:".blue}   ${JSON.stringify(params)}\n`,
                    `${"---Response:".blue} ${JSON.stringify(response)}\n`,
                    `${"---Runtime:".yellow}  ${Date.now() - rsvDate.getTime()}ms\n`
                ].join(""));
            }
        };
    }
    Server.getDefaultLogger = getDefaultLogger;
})(Server = exports.Server || (exports.Server = {}));
