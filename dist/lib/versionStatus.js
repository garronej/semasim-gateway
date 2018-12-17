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
var installer_1 = require("../bin/installer");
var path = require("path");
var scriptLib = require("scripting-tools");
var localVersion = require(path.join(installer_1.module_dir_path, "package.json"))["version"];
function genIntegerInRange(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function genRetryDelay() {
    switch (installer_1.getEnv()) {
        case "PROD":
            return genIntegerInRange(1000, 20 * 1000);
        case "DEV":
            console.log("DEV env, waiting only one second");
            return 1000;
    }
}
exports.genRetryDelay = genRetryDelay;
function getVersion() {
    return __awaiter(this, void 0, void 0, function () {
        var value, _a, parseVersion, localVersionParsed, serverVersionParsed;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    value = "";
                    _b.label = 1;
                case 1:
                    if (!!value) return [3 /*break*/, 7];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, scriptLib.web_get("web." + installer_1.getBaseDomain() + "/api/version")];
                case 3:
                    //TODO: make sure that throw if backend is down
                    //TODO: apparently we may have a response that match to null
                    value = _b.sent();
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    console.log("web." + installer_1.getBaseDomain() + " is down");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, genRetryDelay()); })];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 1];
                case 7:
                    if (value === localVersion) {
                        return [2 /*return*/, { value: value, "status": "UP TO DATE" }];
                    }
                    else {
                        parseVersion = function (version) {
                            var match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)$/);
                            return {
                                "major": parseInt(match[1]),
                                "minor": parseInt(match[2]),
                                "patch": parseInt(match[3])
                            };
                        };
                        localVersionParsed = parseVersion(localVersion);
                        serverVersionParsed = parseVersion(value);
                        if (serverVersionParsed.major !== localVersionParsed.major) {
                            return [2 /*return*/, { value: value, "status": "MAJOR" }];
                        }
                        else if (serverVersionParsed.minor !== localVersionParsed.minor) {
                            return [2 /*return*/, { value: value, "status": "MINOR" }];
                        }
                        else {
                            return [2 /*return*/, { value: value, "status": "PATCH" }];
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.getVersion = getVersion;
