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
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const scriptLib = require("scripting-tools");
const i = require("../bin/installer");
const path = require("path");
const child_process = require("child_process");
const logger = require("logger");
const debug = logger.debugFactory();
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = () => Promise.resolve();
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
/**
 * Return a promise that resolve whent chan-dongle-extended client is initialized
 * (can access getInstance() )
 */
function spawnChanDongleExtended() {
    const dongle_pidfile_path = path.join(i.dongle_dir_path, "working_directory", "pid");
    scriptLib.stopProcessSync.log = debug;
    scriptLib.stopProcessSync.stopProcessAsapSync(dongle_pidfile_path);
    let dongleProcess_isTerminated = false;
    debug("forking chan-dongle-extended");
    const dongleProcess = child_process.spawn(i.dongle_node_path, [path.join(i.dongle_bin_dir_path, "main.js")]);
    (() => {
        const onTerminated = (errorOrCode) => {
            dongleProcess_isTerminated = true;
            if (errorOrCode instanceof Error) {
                const error = errorOrCode;
                debug("dongle could not be spawned", error);
            }
            else {
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
    const prDongleControllerInitialized = new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        const { port } = yield Promise.resolve().then(() => require("chan-dongle-extended-client/dist/lib/misc"));
        yield new Promise(resolve => setTimeout(resolve, 3000));
        while (true) {
            const dc = chan_dongle_extended_client_1.DongleController.getInstance("127.0.0.1", port);
            try {
                yield dc.prInitialization;
            }
            catch (_a) {
                debug("dongle-extended not initialized yet, scheduling retry...");
                yield new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }
            dc.evtClose.attachOnce(() => {
                Promise.reject(new Error("TCP connection lost with chan-dongle-extended"));
            });
            break;
        }
        resolve();
    }));
    beforeExit.impl = () => new Promise(resolve => {
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
    dongleProcess.stdout.on("data", (data) => logger.log(`(dongle) ${data.toString("utf8")}`));
    dongleProcess.stderr.on("data", (data) => logger.log(`(dongle) ${logger.colors.red(data.toString("utf8"))}`));
    return prDongleControllerInitialized;
}
exports.spawnChanDongleExtended = spawnChanDongleExtended;
