"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const util = require("util");
const scriptLib = require("scripting-tools");
const __debugFactory = require("debug");
const path = require("path");
require("colors");
let __logger;
let __logfile_path;
let __relative_from_path;
/**
 * Need to be called before using any function of the module.
 * relative_from should be the absolute path to [module_dir_path]/dist.
 * */
function init(logfile_path, relative_from_path) {
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
    __relative_from_path = relative_from_path;
}
exports.init = init;
/** Create a copy of the current logfile  */
function createLogfileBackup(logfile_backup_path) {
    scriptLib.execSync(`cp ${__logfile_path} ${logfile_backup_path}`);
}
exports.createLogfileBackup = createLogfileBackup;
/** Delete the current logfile, logging anything after calling this will throw exception */
function deleteLogfile() {
    __logger = undefined;
    scriptLib.execSync(`rm ${__logfile_path}`);
}
exports.deleteLogfile = deleteLogfile;
/** log in file and in the console, equivalent of console.log */
exports.log = (...args) => __log("info", args);
/** log only in file */
exports.logQuiet = (...args) => __log("debug", args);
function __log(level, args) {
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
function debugFactory(namespace) {
    if (namespace === undefined) {
        namespace = path.relative(__relative_from_path, debugFactory.getCallerFile());
    }
    const debug = __debugFactory(namespace);
    debug.enabled = true;
    debug.log = exports.log;
    return debug;
}
exports.debugFactory = debugFactory;
(function (debugFactory) {
    function getCallerFile() {
        let originalFunc = Error.prepareStackTrace;
        let callerFile;
        try {
            let err = new Error();
            let currentFile;
            Error.prepareStackTrace = function (err, stack) { return stack; };
            currentFile = err.stack.shift().getFileName();
            while (err.stack.length) {
                callerFile = err.stack.shift().getFileName();
                if (currentFile !== callerFile)
                    break;
            }
        }
        catch (e) { }
        Error.prepareStackTrace = originalFunc;
        return callerFile;
    }
    debugFactory.getCallerFile = getCallerFile;
})(debugFactory = exports.debugFactory || (exports.debugFactory = {}));
