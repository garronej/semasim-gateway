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
var sip = require("ts-sip");
var ts_events_extended_1 = require("ts-events-extended");
var localApiHandlers = require("./localApiHandlers");
var logger = require("logger");
var tls = require("tls");
var versionStatus = require("../versionStatus");
var router = require("./router");
var i = require("../../bin/installer");
//TODO: Implement before exit to close the socket.
var debug = logger.debugFactory();
var idString = "gatewayToBackend";
var apiServer = new sip.api.Server(localApiHandlers.handlers, sip.api.Server.getDefaultLogger({
    idString: idString,
    "log": logger.log,
    "hideKeepAlive": true
}));
var socketCurrent = undefined;
exports.evtConnect = new ts_events_extended_1.SyncEvent();
function connect() {
    return __awaiter(this, void 0, void 0, function () {
        var socket;
        var _this = this;
        return __generator(this, function (_a) {
            socket = new sip.Socket(tls.connect({
                "host": "sip." + i.getBaseDomain(),
                "port": 80
            }), true);
            socket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, versionStatus.genRetryDelay()); })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, versionStatus.getVersionStatus()];
                        case 2:
                            if ((_a.sent()) !== "UP TO DATE") {
                                debug("Need update, restarting ...");
                                process.emit("beforeExit", process.exitCode = 0);
                                return [2 /*return*/];
                            }
                            connect();
                            return [2 /*return*/];
                    }
                });
            }); });
            apiServer.startListening(socket);
            sip.api.client.enableKeepAlive(socket, 10 * 60 * 1000);
            sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
                idString: idString,
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
            socket.evtConnect.attachOnce(function () { return exports.evtConnect.post(socket); });
            router.handle(socket);
            return [2 /*return*/];
        });
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
