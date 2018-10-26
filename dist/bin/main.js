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
const scriptLib = require("scripting-tools");
scriptLib.createService({
    "rootProcess": () => __awaiter(this, void 0, void 0, function* () {
        const [{ node_path, pidfile_path, unix_user, srv_name, program_action_update }, logger,] = yield Promise.all([
            Promise.resolve().then(() => require("./installer")),
            Promise.resolve().then(() => require("logger"))
        ]);
        const debug = logger.debugFactory();
        return {
            pidfile_path,
            srv_name,
            "stop_timeout": 6000,
            "assert_unix_user": "root",
            "daemon_unix_user": unix_user,
            "daemon_node_path": node_path,
            "preForkTask": () => __awaiter(this, void 0, void 0, function* () {
                while (true) {
                    let action;
                    try {
                        action = yield program_action_update();
                    }
                    catch (error) {
                        logger.log("Update error: ", error);
                        debug("Waiting and retying...");
                        yield new Promise(resolve => setTimeout(resolve, 30000));
                        continue;
                    }
                    if (action === "EXIT") {
                        debug("Exiting now");
                        process.emit("beforeExit", process.exitCode = 0);
                        return;
                    }
                    else {
                        break;
                    }
                }
            })
        };
    }),
    "daemonProcess": () => __awaiter(this, void 0, void 0, function* () {
        const [path, fs, { working_directory_path }, logger, { launch, beforeExit }] = yield Promise.all([
            Promise.resolve().then(() => require("path")),
            Promise.resolve().then(() => require("fs")),
            Promise.resolve().then(() => require("./installer")),
            Promise.resolve().then(() => require("logger")),
            Promise.resolve().then(() => require("../lib/launch"))
        ]).catch(error => {
            console.log(error);
            throw error;
        });
        const logfile_path = path.join(working_directory_path, "log");
        return {
            "launch": () => {
                logger.file.enable(logfile_path);
                launch();
            },
            "beforeExitTask": (error) => __awaiter(this, void 0, void 0, function* () {
                if (!!error) {
                    logger.log(error);
                }
                yield Promise.all([
                    logger.file.terminate().then(() => {
                        if (!!error) {
                            scriptLib.execSync(`mv ${logfile_path} ${path.join(path.dirname(logfile_path), "previous_crash.log")}`);
                        }
                        else {
                            fs.unlinkSync(logfile_path);
                        }
                    }),
                    beforeExit()
                ]);
            })
        };
    })
});
