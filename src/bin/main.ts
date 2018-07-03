import * as scriptLib from "scripting-tools";

const stop_timeout= 8000;

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { node_path, pidfile_path, unix_user, installer_js_path, srv_name },
            child_process,
            logger,
        ] = await Promise.all([
            import("./installer"),
            import("child_process"),
            import("logger")
        ]);

        const childProcessDebug = logger.debugFactory("updater");
        const debug= logger.debugFactory("root process");

        return {
            pidfile_path,
            srv_name,
            stop_timeout,
            "assert_unix_user": "root",
            "daemon_unix_user": unix_user,
            "daemon_node_path": node_path,
            "preForkTask": async () => {

                while (true) {

                    try {

                        await new Promise((resolve, reject) => {

                            const childProcess = child_process.exec(`${node_path} ${installer_js_path} update`);

                            childProcess.stdout.on("data", data => childProcessDebug(data.toString()));

                            childProcess
                                .once("error", error => reject(error) )
                                .once("close", exitCode => {

                                    if( exitCode === 0 ){

                                        resolve();

                                    }else{

                                        reject(new Error([
                                            `Updater returned with exitCode ${exitCode}`,
                                            `( Normal if MAJOR update scheduled )`
                                        ].join(" ")));

                                    }

                                })
                                ;


                        });


                    } catch (error) {

                        debug("Ann error occurred while updating, scheduling retry", error);

                        await new Promise(resolve => setTimeout(resolve, 30000));

                    }

                    break;

                }

            }
        };

    },
    "daemonProcess": async () => {

        const [
            path,
            fs,
            { working_directory_path },
            logger,
            { launch, beforeExit }
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

                await Promise.all([
                    logger.file.terminate().then(() => {

                        if (!!error) {

                            scriptLib.execSync(
                                `mv ${logfile_path} ${path.join(path.dirname(logfile_path), "previous_crash.log")}`
                            );

                        } else {

                            fs.unlinkSync(logfile_path);

                        }

                    }),
                    beforeExit(3000)
                ]);

            }
        };

    }
});


