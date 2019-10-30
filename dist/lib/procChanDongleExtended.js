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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var scriptLib = require("scripting-tools");
var i = require("../bin/installer");
var path = require("path");
var child_process = require("child_process");
var logger = require("logger");
var debug = logger.debugFactory();
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = function () { return Promise.resolve(); };
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
/**
 * Return a promise that resolve went chan-dongle-extended client is initialized
 * (can access getInstance() )
 */
function spawnChanDongleExtended() {
    var _this = this;
    var dongle_pidfile_path = path.join(i.dongle_dir_path, "working_directory", "pid");
    scriptLib.stopProcessSync.log = debug;
    scriptLib.stopProcessSync.stopProcessAsapSync(dongle_pidfile_path);
    var dongleProcess_isTerminated = false;
    debug("forking chan-dongle-extended");
    var dongleProcess = child_process.spawn(i.dongle_node_path, [path.join(i.dongle_bin_dir_path, "main.js")]);
    (function () {
        var onTerminated = function (errorOrCode) {
            dongleProcess_isTerminated = true;
            if (errorOrCode instanceof Error) {
                var error = errorOrCode;
                debug("dongle could not be spawned", error);
            }
            else {
                var exitCode = errorOrCode;
                debug("dongle unexpectedly terminated with code " + exitCode);
            }
            throw new Error("chan-dongle-extended not running");
        };
        //Only if can't spawn
        dongleProcess.once("error", onTerminated);
        dongleProcess.once("close", onTerminated);
    })();
    /** Once it resolve Dc.getInstance() can be used synchronously */
    var prDongleControllerInitialized = new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var port, dc, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("chan-dongle-extended-client/dist/lib/misc"); })];
                case 1:
                    port = (_b.sent()).port;
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    if (!true) return [3 /*break*/, 9];
                    dc = chan_dongle_extended_client_1.DongleController.getInstance("127.0.0.1", port);
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 8]);
                    return [4 /*yield*/, dc.prInitialization];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 6:
                    _a = _b.sent();
                    debug("dongle-extended not initialized yet, scheduling retry...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 8:
                    dc.evtClose.attachOnce(function () {
                        Promise.reject(new Error("TCP connection lost with chan-dongle-extended"));
                    });
                    return [3 /*break*/, 9];
                case 9:
                    resolve();
                    return [2 /*return*/];
            }
        });
    }); });
    beforeExit.impl = function () { return new Promise(function (resolve) {
        if (dongleProcess_isTerminated) {
            debug("No need to stop chan-dongle-extended process, it's already dead");
            resolve();
            return;
        }
        debug("Terminating chan-dongle-extended process");
        dongleProcess.removeAllListeners("close");
        dongleProcess.removeAllListeners("error");
        dongleProcess.kill("SIGUSR2");
        dongleProcess.once("error", function () {
            debug("USR2 signal could not be delivered to chan-dongle-extended master process");
            resolve();
        });
        dongleProcess.once("close", function (exitCode) {
            debug("chan-dongle-extended terminated on request with exit code " + exitCode);
            resolve();
        });
    }); };
    dongleProcess.stdout.on("data", function (data) { return logger.log("(dongle) " + data.toString("utf8")); });
    dongleProcess.stderr.on("data", function (data) { return logger.log("(dongle) " + logger.colors.red(data.toString("utf8"))); });
    return prDongleControllerInitialized;
}
exports.spawnChanDongleExtended = spawnChanDongleExtended;
