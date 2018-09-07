import * as scriptLib from "scripting-tools";
import * as i from "../bin/installer";
import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";
import * as logger from "logger";

const debug= logger.debugFactory();

function doSpawn(args: string[]): child_process.ChildProcess {

    const home_path = path.join(i.ast_dir_path, "var", "lib", "asterisk");

    return child_process.spawn(
        i.ast_path,
        ["-C", i.ast_main_conf_path, ...args],
        {
            "cwd": home_path,
            "env": {
                "HOME": home_path,
                "LD_LIBRARY_PATH": i.ld_library_path_for_asterisk
            }
        }

    );

}

const ast_pidfile_path = path.join(i.ast_dir_path, "var", "run", "asterisk", "asterisk.pid");

const cleanupRunfiles = () => {

    for (const file_path of [
        ast_pidfile_path,
        path.join(path.dirname(ast_pidfile_path), "asterisk.ctl")
    ]) {

        if (fs.existsSync(file_path)) {

            debug(`Cleaning up asterisk garbage file ${path.basename(file_path)}`);

            fs.unlinkSync(file_path);

        }

    }

}

export function beforeExit(){
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl = ()=> Promise.resolve();
}

/** Return a promise that resolve when Asterisk is fully booted */
export function spawnAsterisk(): Promise<void>{

    scriptLib.stopProcessSync.log = debug;

    scriptLib.stopProcessSync.stopProcessAsapSync(ast_pidfile_path);

    cleanupRunfiles();

    let astProcess_isTerminated = false;

    debug("spawning asterisk");

    const astProcess = doSpawn(["-fvvvv"]);

    (() => {

        const onTerminated = (errorOrCode: number | null | Error) => {

            astProcess_isTerminated = true;

            cleanupRunfiles();

            if (errorOrCode instanceof Error) {
                const error = errorOrCode;
                debug("Asterisk could not be spawned", error);
            } else {
                const exitCode = errorOrCode;
                debug(`Asterisk unexpectedly terminated with code ${exitCode}`);
            }

            throw new Error("asterisk not running");

        };

        //Only if can't spawn
        astProcess.once("error", onTerminated);

        astProcess.once("close", onTerminated);


    })();

    const prFullyBooted = new Promise<void>(resolve => {

        const onData = (data: Buffer | string) => {

            if (!!(data as Buffer).toString("utf8").match(/Asterisk\ Ready\./)) {

                debug("Asterisk fully booted");

                astProcess.stdout.removeListener("data", onData);

                resolve();

            }

        };

        astProcess.stdout.on("data", onData);

    });

    beforeExit.impl = () => new Promise<void>(resolve => {

        if (astProcess_isTerminated) {

            debug("No need to stop Asterisk process it's already dead");

            resolve();

            return;

        }

        debug("Terminating Asterisk process");

        astProcess.removeAllListeners("close");

        let processCoreStopNow_hadOutput= false;

        const processCoreStopNow = doSpawn(["-rx", "core stop now"]);

        processCoreStopNow.stdout.once("data", ()=> processCoreStopNow_hadOutput= true ); 

        processCoreStopNow.stderr.once("data", ()=> processCoreStopNow_hadOutput= true );

        //Can't spawn
        processCoreStopNow.once("error", () => {

            debug("CLI command 'core stop now' could not be spawned");

            processCoreStopNow.emit("close", 1);

        });

        processCoreStopNow.once("close", exitCode => {

            if (
                exitCode !== 0 ||
                processCoreStopNow_hadOutput
            ) {

                debug("CLI command 'core stop now' failed, we let exit handler kill asterisk");

                astProcess.removeAllListeners("close");

                resolve();

            }else{

                debug("CLI command 'core stop now' success");

            }

        });

        astProcess.once("close", exitCode => {

            debug(`Asterisk process terminated (exit code: ${exitCode})`);

            resolve();

        });

    });

    astProcess.stdout.on("data", (data: Buffer) => logger.log(
        `(asterisk) ${data.toString("utf8")}`
    ));

    astProcess.stderr.on("data", (data: Buffer) => logger.log(
        `(asterisk) ${logger.colors.red(data.toString("utf8"))}`
    ));

    return prFullyBooted;

}

