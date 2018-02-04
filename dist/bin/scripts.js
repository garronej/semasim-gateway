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
Object.defineProperty(exports, "__esModule", { value: true });
const _constants_1 = require("../lib/_constants");
const path = require("path");
const modulePath = path.join(__dirname, "..", "..");
const systemdServicePath = path.join("/etc", "systemd", "system", `${_constants_1.c.serviceName}.service`);
require("rejection-tracker").main(modulePath);
const program = require("commander");
const _ = require("../tools/commanderFunctions");
const fs_1 = require("fs");
require("colors");
program
    .command("postinstall")
    .description([
    "Install the systemd service to launch at boot"
].join(" "))
    .action(() => __awaiter(this, void 0, void 0, function* () {
    yield installService();
    process.exit(0);
}));
program
    .command("preuninstall")
    .description([
    "Remove service from systemd"
].join(" "))
    .action(() => __awaiter(this, void 0, void 0, function* () {
    yield removeService();
    process.exit(0);
}));
program.parse(process.argv);
function installService() {
    return __awaiter(this, void 0, void 0, function* () {
        const node_execpath = process.argv[0];
        console.log("Now you will be ask to choose the user that will run the service\n".yellow);
        const user = (yield _.ask("User? (press enter for root)")) || "root";
        const group = (yield _.ask("Group? (press enter for root)")) || "root";
        let service = [
            `[Unit]`,
            `Description=chan dongle extended service`,
            `After=network.target`,
            ``,
            `[Service]`,
            `ExecStart=${node_execpath} ${modulePath}/dist/lib/main`,
            `PermissionsStartOnly=true`,
            `WorkingDirectory=${modulePath}`,
            `Restart=always`,
            `RestartSec=10`,
            `StandardOutput=syslog`,
            `StandardError=syslog`,
            `SyslogIdentifier=Semasim`,
            `User=${user}`,
            `Group=${group}`,
            `Environment=NODE_ENV=production DEBUG=_*`,
            ``,
            `[Install]`,
            `WantedBy=multi-user.target`,
            ``
        ].join("\n");
        yield _.writeFileAssertSuccess(systemdServicePath, service);
        yield _.run("systemctl daemon-reload");
        console.log([
            `Service successfully installed!`.green,
            `${systemdServicePath}: \n\n ${service}`,
            `To run the service:`.yellow,
            `sudo systemctl start ${_constants_1.c.serviceName}`,
            `To automatically start the service on boot:`.yellow,
            `sudo systemctl enable ${_constants_1.c.serviceName}`,
        ].join("\n"));
    });
}
function removeService() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield _.run(`systemctl stop ${_constants_1.c.serviceName}.service`);
            yield _.run(`systemctl disable ${_constants_1.c.serviceName}.service`);
        }
        catch (error) { }
        try {
            fs_1.unlinkSync(systemdServicePath);
        }
        catch (error) { }
        yield _.run("systemctl daemon-reload");
        console.log(`${_constants_1.c.serviceName}.service removed from systemd`.green);
    });
}
