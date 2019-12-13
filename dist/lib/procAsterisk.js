"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var scriptLib = require("scripting-tools");
var i = require("../bin/installer");
var path = require("path");
var fs = require("fs");
var child_process = require("child_process");
var logger = require("logger");
var debug = logger.debugFactory();
function doSpawn(args) {
    var home_path = path.join(i.ast_dir_path, "var", "lib", "asterisk");
    return child_process.spawn(i.ast_path, __spread(["-C", i.ast_main_conf_path], args), {
        "cwd": home_path,
        "env": {
            "HOME": home_path,
            "LD_LIBRARY_PATH": i.get_ld_library_path_for_asterisk()
        }
    });
}
var ast_pidfile_path = path.join(i.ast_dir_path, "var", "run", "asterisk", "asterisk.pid");
var cleanupRunfiles = function () {
    var e_1, _a;
    try {
        for (var _b = __values([
            ast_pidfile_path,
            path.join(path.dirname(ast_pidfile_path), "asterisk.ctl")
        ]), _c = _b.next(); !_c.done; _c = _b.next()) {
            var file_path = _c.value;
            if (fs.existsSync(file_path)) {
                debug("Cleaning up asterisk garbage file " + path.basename(file_path));
                fs.unlinkSync(file_path);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
};
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = function () { return Promise.resolve(); };
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
/** Return a promise that resolve when Asterisk is fully booted */
function spawnAsterisk() {
    scriptLib.stopProcessSync.log = debug;
    scriptLib.stopProcessSync.stopProcessAsapSync(ast_pidfile_path);
    cleanupRunfiles();
    var astProcess_isTerminated = false;
    debug("spawning asterisk");
    var astProcess = doSpawn(["-fvvvv"]);
    (function () {
        var onTerminated = function (errorOrCode) {
            astProcess_isTerminated = true;
            cleanupRunfiles();
            if (errorOrCode instanceof Error) {
                var error = errorOrCode;
                debug("Asterisk could not be spawned", error);
            }
            else {
                var exitCode = errorOrCode;
                debug("Asterisk unexpectedly terminated with code " + exitCode);
            }
            throw new Error("asterisk not running");
        };
        //Only if can't spawn
        astProcess.once("error", onTerminated);
        astProcess.once("close", onTerminated);
    })();
    var prFullyBooted = new Promise(function (resolve) {
        var onData = function (data) {
            if (!!data.toString("utf8").match(/Asterisk\ Ready\./)) {
                debug("Asterisk fully booted");
                astProcess.stdout.removeListener("data", onData);
                resolve();
            }
        };
        astProcess.stdout.on("data", onData);
    });
    beforeExit.impl = function () { return new Promise(function (resolve) {
        if (astProcess_isTerminated) {
            debug("No need to stop Asterisk process it's already dead");
            resolve();
            return;
        }
        debug("Terminating Asterisk process");
        astProcess.removeAllListeners("close");
        var processCoreStopNow_hadOutput = false;
        var processCoreStopNow = doSpawn(["-rx", "core stop now"]);
        processCoreStopNow.stdout.once("data", function () { return processCoreStopNow_hadOutput = true; });
        processCoreStopNow.stderr.once("data", function () { return processCoreStopNow_hadOutput = true; });
        //Can't spawn
        processCoreStopNow.once("error", function () {
            debug("CLI command 'core stop now' could not be spawned");
            processCoreStopNow.emit("close", 1);
        });
        processCoreStopNow.once("close", function (exitCode) {
            if (exitCode !== 0 ||
                processCoreStopNow_hadOutput) {
                debug("CLI command 'core stop now' failed, we let exit handler kill asterisk");
                astProcess.removeAllListeners("close");
                resolve();
            }
            else {
                debug("CLI command 'core stop now' success");
            }
        });
        astProcess.once("close", function (exitCode) {
            debug("Asterisk process terminated (exit code: " + exitCode + ")");
            resolve();
        });
    }); };
    astProcess.stdout.on("data", function (data) { return logger.log("(asterisk) " + data.toString("utf8")); });
    astProcess.stderr.on("data", function (data) { return logger.log("(asterisk) " + logger.colors.red(data.toString("utf8"))); });
    return prFullyBooted;
}
exports.spawnAsterisk = spawnAsterisk;
