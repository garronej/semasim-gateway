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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var scriptLib = require("scripting-tools");
scriptLib.createService({
    "rootProcess": function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, node_path, pidfile_path, unix_user, srv_name, program_action_update, logger, debug;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        Promise.resolve().then(function () { return require("./installer"); }),
                        Promise.resolve().then(function () { return require("logger"); })
                    ])];
                case 1:
                    _a = __read.apply(void 0, [_c.sent(), 2]), _b = _a[0], node_path = _b.node_path, pidfile_path = _b.pidfile_path, unix_user = _b.unix_user, srv_name = _b.srv_name, program_action_update = _b.program_action_update, logger = _a[1];
                    debug = logger.debugFactory();
                    return [2 /*return*/, {
                            pidfile_path: pidfile_path,
                            srv_name: srv_name,
                            "stop_timeout": 6000,
                            "assert_unix_user": "root",
                            "daemon_unix_user": unix_user,
                            "daemon_node_path": node_path,
                            "preForkTask": function () { return __awaiter(_this, void 0, void 0, function () {
                                var action, error_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!true) return [3 /*break*/, 6];
                                            action = void 0;
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, 3, , 5]);
                                            return [4 /*yield*/, program_action_update()];
                                        case 2:
                                            action = _a.sent();
                                            return [3 /*break*/, 5];
                                        case 3:
                                            error_1 = _a.sent();
                                            logger.log("Update error: ", error_1);
                                            debug("Waiting and retying...");
                                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 30000); })];
                                        case 4:
                                            _a.sent();
                                            return [3 /*break*/, 0];
                                        case 5:
                                            if (action === "EXIT") {
                                                debug("Exiting now");
                                                process.emit("beforeExit", process.exitCode = 0);
                                                return [2 /*return*/];
                                            }
                                            else {
                                                return [3 /*break*/, 6];
                                            }
                                            return [3 /*break*/, 0];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); }
                        }];
            }
        });
    }); },
    "daemonProcess": function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, path, fs, working_directory_path, logger, _b, launch, beforeExit, logfile_path;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        Promise.resolve().then(function () { return require("path"); }),
                        Promise.resolve().then(function () { return require("fs"); }),
                        Promise.resolve().then(function () { return require("./installer"); }),
                        Promise.resolve().then(function () { return require("logger"); }),
                        Promise.resolve().then(function () { return require("../lib/launch"); })
                    ]).catch(function (error) {
                        console.log(error);
                        throw error;
                    })];
                case 1:
                    _a = __read.apply(void 0, [_c.sent(), 5]), path = _a[0], fs = _a[1], working_directory_path = _a[2].working_directory_path, logger = _a[3], _b = _a[4], launch = _b.launch, beforeExit = _b.beforeExit;
                    logfile_path = path.join(working_directory_path, "log");
                    return [2 /*return*/, {
                            "launch": function () {
                                logger.file.enable(logfile_path);
                                launch();
                            },
                            "beforeExitTask": function (error) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!!error) {
                                                logger.log(error);
                                            }
                                            return [4 /*yield*/, Promise.all([
                                                    logger.file.terminate().then(function () {
                                                        if (!!error) {
                                                            scriptLib.execSync("mv " + logfile_path + " " + path.join(path.dirname(logfile_path), "previous_crash.log"));
                                                        }
                                                        else {
                                                            fs.unlinkSync(logfile_path);
                                                        }
                                                    }),
                                                    beforeExit()
                                                ])];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }
                        }];
            }
        });
    }); }
});