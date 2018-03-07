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
class Server {
    constructor(handlers) {
        this.handlers = handlers;
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
            let methodName = ApiMessage_1.ApiMessage.Request.readMethodName(sipRequest);
            let params;
            try {
                var { handler, sanityCheck } = this.handlers[methodName];
            }
            catch (_a) {
                console.log(`Method ${methodName} not implemented`.red);
                socket.destroy();
                return;
            }
            try {
                params = ApiMessage_1.ApiMessage.parsePayload(sipRequest, sanityCheck);
            }
            catch (_b) {
                console.log("Api request malformed".red);
                socket.destroy();
                return;
            }
            let response;
            try {
                response = yield handler(params, socket);
            }
            catch (_c) {
                console.log("Request made handler throw error".red);
                socket.destroy();
                return;
            }
            let sipRequestResp = ApiMessage_1.ApiMessage.Response.buildSip(ApiMessage_1.ApiMessage.readActionId(sipRequest), response);
            misc.buildNextHopPacket.pushVia(socket, sipRequestResp);
            socket.write(sipRequestResp);
        }));
    }
}
exports.Server = Server;
