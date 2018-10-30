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
const sip = require("ts-sip");
const ts_events_extended_1 = require("ts-events-extended");
const localApiHandlers = require("./localApiHandlers");
const logger = require("logger");
const tls = require("tls");
const versionStatus = require("../versionStatus");
const router = require("./router");
const i = require("../../bin/installer");
//TODO: Implement before exit to close the socket.
const debug = logger.debugFactory();
const idString = "gatewayToBackend";
const apiServer = new sip.api.Server(localApiHandlers.handlers, sip.api.Server.getDefaultLogger({
    idString,
    "log": logger.log,
    "hideKeepAlive": true
}));
let socketCurrent = undefined;
exports.evtConnect = new ts_events_extended_1.SyncEvent();
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO: Bind to local ip ?
        //TODO: see if local address is automatically set, if so avoid getting Active interface
        //ip
        const socket = new sip.Socket(tls.connect({
            "host": `sip.${i.getBaseDomain()}`,
            "port": 80
        }), true);
        socket.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, versionStatus.genRetryDelay()));
            if ((yield versionStatus.getVersionStatus()) !== "UP TO DATE") {
                debug("Need update, restarting ...");
                process.emit("beforeExit", process.exitCode = 0);
                return;
            }
            connect();
        }));
        apiServer.startListening(socket);
        sip.api.client.enableKeepAlive(socket, 10 * 60 * 1000);
        sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        }));
        socket.enableLogger({
            "socketId": idString,
            "remoteEndId": "BACKEND",
            "localEndId": "GATEWAY",
            "connection": false,
            "error": true,
            "close": true,
            "incomingTraffic": false,
            "outgoingTraffic": false,
            "colorizedTraffic": "IN",
            "ignoreApiTraffic": true
        }, logger.log);
        socketCurrent = socket;
        socket.evtConnect.attachOnce(() => exports.evtConnect.post(socket));
        router.handle(socket);
    });
}
exports.connect = connect;
function get() {
    if (!socketCurrent ||
        socketCurrent.evtClose.postCount !== 0 ||
        socketCurrent.evtConnect.postCount === 0) {
        return exports.evtConnect.waitFor();
    }
    else {
        return socketCurrent;
    }
}
exports.get = get;
