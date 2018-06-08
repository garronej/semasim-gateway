import * as winston from "winston";
import * as util from "util";
import * as scriptLib from "scripting-tools";
import * as __debugFactory from "debug";
import * as path from "path";
import "colors";

let __logger: any;
let __logfile_path: string;
let __relative_from_path: string;

/** 
 * Need to be called before using any function of the module. 
 * relative_from should be the absolute path to [module_dir_path]/dist.
 * */
export function init(logfile_path: string, relative_from_path: string) {

    scriptLib.execSync(`rm -f ${logfile_path}`);

    __logger = winston.createLogger({
        "format": winston.format.printf(({ message }) => message),
        "transports": [
            new winston.transports.File({
                "level": "debug",
                "filename": logfile_path,
                "maxsize": 1000000
            }),
            new winston.transports.Console({ "level": "info" })
        ]
    });

    __relative_from_path= relative_from_path;

}

/** Create a copy of the current logfile  */
export function createLogfileBackup(logfile_backup_path: string) {
    scriptLib.execSync(`cp ${__logfile_path} ${logfile_backup_path}`);
}

/** Delete the current logfile, logging anything after calling this will throw exception */
export function deleteLogfile(){
    __logger= undefined;
    scriptLib.execSync(`rm ${__logfile_path}`);
}

/** log in file and in the console, equivalent of console.log */
export const log: typeof console.log = (...args) => __log("info", args);

/** log only in file */
export const logQuiet: typeof console.log = (...args) => __log("debug", args);

function __log(level: "info" | "debug", args: any[]): void {

    __logger.log({
        level,
        "message": util.format.apply(util.format, args)
    });

}

/** 
 * Provide a debug object from the well known package.
 * It is enabled with a namespace given in argument
 * and leverage the log of this module in place of console.log
 * if namespace is not specified one will be computed based on the caller file name.
 */
export function debugFactory(namespace?: string): __debugFactory.IDebugger {

    if( namespace === undefined ){

        namespace = path.relative(__relative_from_path, debugFactory.getCallerFile());

    }

    const debug = __debugFactory(namespace);
    debug.enabled = true;
    debug.log = log;

    return debug;

}

export namespace debugFactory {

    export function getCallerFile() {

        let originalFunc = Error.prepareStackTrace;

        let callerFile;

        try {
            let err: any = new Error();
            let currentFile;

            Error.prepareStackTrace = function (err, stack) { return stack; };

            currentFile = err.stack!.shift().getFileName();

            while (err.stack.length) {
                callerFile = err.stack.shift().getFileName();

                if (currentFile !== callerFile) break;
            }
        } catch (e) { }

        Error.prepareStackTrace = originalFunc;

        return callerFile;
    }

}



