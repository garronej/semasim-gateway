/// <reference types="debug" />
import * as __debugFactory from "debug";
import "colors";
/**
 * Need to be called before using any function of the module.
 * relative_from should be the absolute path to [module_dir_path]/dist.
 * */
export declare function init(logfile_path: string, relative_from_path: string): void;
/** Create a copy of the current logfile  */
export declare function createLogfileBackup(logfile_backup_path: string): void;
/** Delete the current logfile, logging anything after calling this will throw exception */
export declare function deleteLogfile(): void;
/** log in file and in the console, equivalent of console.log */
export declare const log: typeof console.log;
/** log only in file */
export declare const logQuiet: typeof console.log;
/**
 * Provide a debug object from the well known package.
 * It is enabled with a namespace given in argument
 * and leverage the log of this module in place of console.log
 * if namespace is not specified one will be computed based on the caller file name.
 */
export declare function debugFactory(namespace?: string): __debugFactory.IDebugger;
export declare namespace debugFactory {
    function getCallerFile(): any;
}
