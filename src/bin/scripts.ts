#!/usr/bin/env node

const serviceName= "semasim-gateway";

import * as path from "path";
const modulePath = path.join(__dirname, "..", "..");
const systemdServicePath = path.join("/etc", "systemd", "system", `${serviceName}.service`);

require("rejection-tracker").main(modulePath);

import { exec } from "child_process";
import * as readline from "readline";
import { readFileSync, writeFile, unlinkSync, existsSync } from "fs";
import * as program from "commander";
import "colors";

program
    .command("postinstall")
    .description([
        "Install the systemd service to launch at boot"
    ].join(" "))
    .action(async () => {

        await installService();

        process.exit(0);

    });

program
    .command("preuninstall")
    .description([
        "Remove service from systemd"
    ].join(" "))
    .action(async () => {

        await removeService();

        process.exit(0);

    });

program.parse(process.argv);

async function installService() {

    const node_execpath = process.argv[0];

    console.log([
        "Now you will be ask to choose the user that will run the service\n",
    ].join("").yellow);

    const user = (await ask("User? (press enter for root)")) || "root";

    const group = (await ask("Group? (press enter for root)")) || "root";

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

    await writeFileAssertSuccess(systemdServicePath, service);

    await run("systemctl daemon-reload");

    console.log([
        `Semasim gateway service successfully installed!`.green,
        `${systemdServicePath}: \n\n ${service}`,
        `To run the service:`.yellow,
        `sudo systemctl start ${serviceName}`,
        `To automatically start the service on boot:`.yellow,
        `sudo systemctl enable ${serviceName}`,
    ].join("\n"));

}

async function removeService() {

    try {

        await run(`systemctl stop ${serviceName}.service`);

        await run(`systemctl disable ${serviceName}.service`);

    } catch (error) { }

    try { unlinkSync(systemdServicePath); } catch (error) { }

    await run("systemctl daemon-reload");

    console.log(`${serviceName}.service removed from systemd`.green);

}

export function run(command: string): Promise<string> {

    return new Promise<string>((resolve, reject) => {

        exec(command, (error, stdout) => {

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(stdout);

        });

    });

}

export function ask(question): Promise<string> {

    const rl = readline.createInterface({
        "input": process.stdin,
        "output": process.stdout
    })

    return new Promise<string>(resolve => {

        rl.question(question + "\n> ", answer => {

            resolve(answer);

            rl.close();

        });


    });

}

export function writeFileAssertSuccess(filename: string, data: string): Promise<void> {

    return new Promise<void>(
        resolve => writeFile(
            filename,
            data,
            { "encoding": "utf8", "flag": "w" },
            error => {
                if (error) {
                    console.log(`Error: Failed to write ${filename}: ${error.message}`.red);
                    process.exit(1);
                }
                resolve();
            }
        )
    );

}