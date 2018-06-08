import * as fs from "fs";
import { launch } from "../lib/launch";
import * as os from "os";
import { unix_user, pid_file_path, working_directory_path, module_dir_path } from "./installer";
import * as logger from "../tools/logger"
import * as path from "path";
const debug = logger.debugFactory("main");

if( os.userInfo().username !== unix_user ){
    throw new Error(`Must be executed by unix user: ${unix_user}`);
}

fs.writeFileSync(pid_file_path, Buffer.from(process.pid.toString(), "utf8"));

logger.init(
    path.join(working_directory_path, "curr.log"),
    path.join(module_dir_path, "dist")
);

process.on("warning", w => debug("Process waning", w));


function cleanupAndExit(code: number) {

    debug(`cleaning up and exiting with code ${code}`);

    if (code !== 0) {

        debug("Create crash report");

        logger.createLogfileBackup(path.join(working_directory_path,"crash.log"));

    }

    logger.deleteLogfile();

    fs.unlinkSync(pid_file_path); 

    process.exit(code);

}

process.once("SIGINT", () => { debug("Ctrl+C pressed ( SIGINT )"); cleanupAndExit(2); });

process.once("SIGUSR2", () => { debug("Stop script called (SIGUSR2)"); cleanupAndExit(0); });

process.once("beforeExit", code => cleanupAndExit(code));

process.removeAllListeners("uncaughtException");
process.once("uncaughtException", error => { debug("uncaughtException", error); cleanupAndExit(1); });

process.removeAllListeners("unhandledRejection");
process.once("unhandledRejection", error => { debug("unhandledRejection", error); cleanupAndExit(1); });

launch();
