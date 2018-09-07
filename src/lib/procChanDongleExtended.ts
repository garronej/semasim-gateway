
import { DongleController as Dc } from "chan-dongle-extended-client";
import * as scriptLib from "scripting-tools";
import * as i from "../bin/installer";
import * as path from "path";
import * as child_process from "child_process";
import * as logger from "logger";

const debug= logger.debugFactory();

export function beforeExit(){
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl = ()=> Promise.resolve();
}

/** 
 * Return a promise that resolve whent chan-dongle-extended client is initialized 
 * (can access getInstance() )
 */
export function spawnChanDongleExtended(): Promise<void> {

    const dongle_pidfile_path= path.join(i.dongle_dir_path, "working_directory", "pid");

    scriptLib.stopProcessSync.log = debug;

    scriptLib.stopProcessSync.stopProcessAsapSync(dongle_pidfile_path);

    let dongleProcess_isTerminated = false;

    debug("forking chan-dongle-extended");

    const dongleProcess = child_process.spawn(
        i.dongle_node_path,
        [path.join(i.dongle_bin_dir_path, "main.js")]
    );

    (() => {

        const onTerminated = (errorOrCode: number | null | Error) => {

            dongleProcess_isTerminated = true;

            if (errorOrCode instanceof Error) {
                const error = errorOrCode;
                debug("dongle could not be spawned", error);
            } else {
                const exitCode = errorOrCode;
                debug(`dongle unexpectedly terminated with code ${exitCode}`);
            }

            throw new Error(`chan-dongle-extended not running`);

        };

        //Only if can't spawn
        dongleProcess.once("error", onTerminated);

        dongleProcess.once("close", onTerminated);


    })();

    /** Once it resolve Dc.getInstance() can be used synchronously */
    const prDongleControllerInitialized = new Promise<void>(async resolve => {

        const { port } = await import("chan-dongle-extended-client/dist/lib/misc");

        await new Promise(resolve => setTimeout(resolve, 3000));

        while (true) {

            const dc = Dc.getInstance("127.0.0.1", port);

            try {

                await dc.prInitialization;

            } catch{

                debug("dongle-extended not initialized yet, scheduling retry...");

                await new Promise(resolve => setTimeout(resolve, 3000));

                continue;

            }

            dc.evtClose.attachOnce(
                () => {
                    Promise.reject(new Error("TCP connection lost with chan-dongle-extended"))
                }
            );

            break;

        }

        resolve();

    });

    beforeExit.impl = () => new Promise<void>(resolve => {

        if (dongleProcess_isTerminated) {

            debug("No need to stop chan-dongle-extended process, it's already dead");

            resolve();

            return;

        }

        debug("Terminating chan-dongle-extended process");


        dongleProcess.removeAllListeners("close");
        dongleProcess.removeAllListeners("error");

        dongleProcess.kill("SIGUSR2");

        dongleProcess.once("error", () => {

            debug("USR2 signal could not be delivered to chan-dongle-extended master process");

            resolve();

        });

        dongleProcess.once("close", exitCode => {

            debug(`chan-dongle-extended terminated on request with exit code ${exitCode}`);

            resolve();

        });

    });

    dongleProcess.stdout.on("data", (data: Buffer) => logger.log(
        `(dongle) ${data.toString("utf8")}`
    ));

    dongleProcess.stderr.on("data", (data: Buffer) => logger.log(
        `(dongle) ${logger.colors.red(data.toString("utf8"))}`
    ));

    return prDongleControllerInitialized;

}
