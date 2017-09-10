#!/usr/bin/env node
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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var _constants_1 = require("../lib/_constants");
var path = require("path");
var modulePath = path.join(__dirname, "..", "..");
var systemdServicePath = path.join("/etc", "systemd", "system", _constants_1.c.serviceName + ".service");
require("rejection-tracker").main(modulePath);
var program = require("commander");
var _ = require("../tools/commanderFunctions");
var fs_1 = require("fs");
require("colors");
program
    .command("postinstall")
    .description([
    "Install the systemd service to launch at boot"
].join(" "))
    .action(function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, installService()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
program
    .command("preuninstall")
    .description([
    "Remove service from systemd"
].join(" "))
    .action(function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, removeService()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
program.parse(process.argv);
function installService() {
    return __awaiter(this, void 0, void 0, function () {
        var node_execpath, user, group, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    node_execpath = process.argv[0];
                    console.log([
                        "Now you will be ask to choose the user that will run the service\n",
                    ].join("").yellow);
                    return [4 /*yield*/, _.ask("User? (press enter for root)")];
                case 1:
                    user = (_a.sent()) || "root";
                    return [4 /*yield*/, _.ask("Group? (press enter for root)")];
                case 2:
                    group = (_a.sent()) || "root";
                    service = [
                        "[Unit]",
                        "Description=chan dongle extended service",
                        "After=network.target",
                        "",
                        "[Service]",
                        "ExecStart=" + node_execpath + " " + modulePath + "/dist/lib/main",
                        "PermissionsStartOnly=true",
                        "WorkingDirectory=" + modulePath,
                        "Restart=always",
                        "RestartSec=10",
                        "StandardOutput=syslog",
                        "StandardError=syslog",
                        "SyslogIdentifier=Semasim",
                        "User=" + user,
                        "Group=" + group,
                        "Environment=NODE_ENV=production DEBUG=_*",
                        "",
                        "[Install]",
                        "WantedBy=multi-user.target",
                        ""
                    ].join("\n");
                    return [4 /*yield*/, _.writeFileAssertSuccess(systemdServicePath, service)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, _.run("systemctl daemon-reload")];
                case 4:
                    _a.sent();
                    console.log([
                        "Service successfully installed!".green,
                        systemdServicePath + ": \n\n " + service,
                        "To run the service:".yellow,
                        "sudo systemctl start " + _constants_1.c.serviceName,
                        "To automatically start the service on boot:".yellow,
                        "sudo systemctl enable " + _constants_1.c.serviceName,
                    ].join("\n"));
                    return [2 /*return*/];
            }
        });
    });
}
function removeService() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, _.run("systemctl stop " + _constants_1.c.serviceName + ".service")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, _.run("systemctl disable " + _constants_1.c.serviceName + ".service")];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    return [3 /*break*/, 4];
                case 4:
                    try {
                        fs_1.unlinkSync(systemdServicePath);
                    }
                    catch (error) { }
                    return [4 /*yield*/, _.run("systemctl daemon-reload")];
                case 5:
                    _a.sent();
                    console.log((_constants_1.c.serviceName + ".service removed from systemd").green);
                    return [2 /*return*/];
            }
        });
    });
}
