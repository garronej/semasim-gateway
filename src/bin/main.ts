import * as scriptLib from "scripting-tools";

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { node_path, pidfile_path, unix_user, srv_name, update, dongle },
            { logger },
        ] = await Promise.all([
            import("./installer"),
            import("../tools/logger")
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

                debug("Checking tty0tty...");

                await scriptLib.exec(`${dongle.installer_cmd} re-install-tty0tty-if-needed`);

                debug("...OK");

                while (true) {

                    let action: "LAUNCH" | "EXIT";

                    try {

                        action = await update();

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

        const [path, { logger }] = await Promise.all([
            import("path"),
            import("../tools/logger")
        ]);

        const logfile_path = path.join(
            (await import("./installer")).working_directory_path,
            "current.log"
        );

        logger.file.enable(logfile_path);

        const { launch, beforeExit } = await import("../lib/launch");

        return {
            launch,
            "beforeExitTask": async error => {

                if (!!error) {

                    logger.log(error);

                }

                await Promise.all([
                    logger.file.terminate().then(() =>
                        scriptLib.fs_move(
                            "MOVE",
                            logfile_path,
                            path.join(
                                path.dirname(logfile_path),
                                `previous${!!error ? "_crash" : ""}.log`
                            )
                        )
                    ),
                    beforeExit()
                ]);

            }
        };

    }
});


