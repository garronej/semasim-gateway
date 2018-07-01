import * as scriptLib from "scripting-tools";

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { node_path, pidfile_path, unix_user, installer_js_path },
            child_process,
            logger,
        ] = await Promise.all([
            import("./installer"),
            import("child_process"),
            import("logger")
        ]);

        const childProcessDebug = logger.debugFactory("updater");

        return {
            pidfile_path,
            "assert_unix_user": "root",
            "daemon_unix_user": unix_user,
            "daemon_node_path": node_path,
            "preForkTask": async terminateChildProcesses => new Promise<void>((resolve, reject) => {

                const childProcess = child_process.exec(`${node_path} ${installer_js_path} update`);

                childProcess.stdout.on("data", data => childProcessDebug(data.toString()));

                childProcess
                    .once("error", error => { 

                        terminateChildProcesses.impl = ()=> Promise.resolve();

                        reject(error); 

                    })
                    .once("close", code => {

                        terminateChildProcesses.impl = () => Promise.resolve();

                        switch (code) {
                            case 0:
                                resolve();
                                break;
                            case 43:
                                process.emit("beforeExit", process.exitCode = 0);
                                break;
                            default:
                                reject(new Error("Update failed"));
                        }

                    })
                    ;

                terminateChildProcesses.impl = () => new Promise(resolve_ => {

                    resolve = () => resolve_();

                    childProcess.kill("SIGKILL");

                });


            })
        };

    },
    "daemonProcess": async () => {

        const [
            path,
            fs,
            { working_directory_path },
            logger,
            { launch }
        ] = await Promise.all([
            import("path"),
            import("fs"),
            import("./installer"),
            import("logger"),
            import("../lib/launch")
        ]);

        const logfile_path = path.join(working_directory_path, "log");

        return {
            "launch": () => {

                logger.file.enable(logfile_path);

                launch();

            },
            "beforeExitTask": async error => {

                if (!!error) {

                    logger.log(error);


                }

                await logger.file.terminate();

                if (!!error) {

                    scriptLib.execSync(`mv ${logfile_path} ${path.join(path.dirname(logfile_path), "previous_crash.log")}`);

                } else {

                    fs.unlinkSync(logfile_path);

                }

            }
        };

    }
});


