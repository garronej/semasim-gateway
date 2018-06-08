"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const launch_1 = require("../lib/launch");
const os = require("os");
const installer_1 = require("./installer");
const logger = require("../tools/logger");
const path = require("path");
const debug = logger.debugFactory("main");
if (os.userInfo().username !== installer_1.unix_user) {
    throw new Error(`Must be executed by unix user: ${installer_1.unix_user}`);
}
fs.writeFileSync(installer_1.pid_file_path, Buffer.from(process.pid.toString(), "utf8"));
logger.init(path.join(installer_1.working_directory_path, "curr.log"), path.join(installer_1.module_dir_path, "dist"));
process.on("warning", w => debug("Process waning", w));
function cleanupAndExit(code) {
    debug(`cleaning up and exiting with code ${code}`);
    if (code !== 0) {
        debug("Create crash report");
        logger.createLogfileBackup(path.join(installer_1.working_directory_path, "crash.log"));
    }
    logger.deleteLogfile();
    fs.unlinkSync(installer_1.pid_file_path);
    process.exit(code);
}
process.once("SIGINT", () => { debug("Ctrl+C pressed ( SIGINT )"); cleanupAndExit(2); });
process.once("SIGUSR2", () => { debug("Stop script called (SIGUSR2)"); cleanupAndExit(0); });
process.once("beforeExit", code => cleanupAndExit(code));
process.removeAllListeners("uncaughtException");
process.once("uncaughtException", error => { debug("uncaughtException", error); cleanupAndExit(1); });
process.removeAllListeners("unhandledRejection");
process.once("unhandledRejection", error => { debug("unhandledRejection", error); cleanupAndExit(1); });
launch_1.launch();
