import * as scriptLib from "scripting-tools";

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { node_path, pidfile_path, unix_user, srv_name, program_action_update },
            logger,
        ] = await Promise.all([
            import("./installer"),
            import("logger")
        ]);

        const debug = logger.debugFactory();

        return {
            pidfile_path,
            srv_name,
            "stop_timeout": 6000, /* NOTE: Should be greater than the one of chan-dongle-extended */
            "assert_unix_user": "root",
            "daemon_unix_user": unix_user,
            "daemon_node_path": node_path,
            "preForkTask": async () => {

                while (true) {

                    let action: "LAUNCH" | "EXIT";

                    try {

                        action = await program_action_update();

                    } catch (error) {

                        logger.log("Update error: ", error);

                        debug("Waiting and retying...");

                        await new Promise(resolve => setTimeout(resolve, 30000));

                        continue;

                    }

                    if (action === "EXIT") {

                        debug("Exiting now");

                        process.emit("beforeExit", process.exitCode = 0);

                        return;

                    } else {

                        break;

                    }

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
        ]).catch(error=> {
            console.log(error);
            throw error;
        });

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
                    beforeExit()
                ]);

            }
        };

    }
});


