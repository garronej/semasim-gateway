"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var scriptLib = require("scripting-tools");
exports.module_dir_path = path.join(__dirname, "..", "..");
exports.unix_user = "semasim";
exports.srv_name = "semasim";
exports.working_directory_path = path.join(exports.module_dir_path, "working_directory");
exports.node_path = path.join(exports.module_dir_path, "node");
var installed_pkg_record_path = path.join(exports.module_dir_path, "pkg_installed.json");
exports.ast_dir_path = path.join(exports.working_directory_path, "asterisk");
exports.ast_path = path.join(exports.ast_dir_path, "sbin", "asterisk");
exports.dongle_dir_path = path.join(exports.working_directory_path, "dongle");
exports.dongle_node_path = path.join(exports.dongle_dir_path, "node");
exports.dongle_bin_dir_path = path.join(exports.dongle_dir_path, "dist", "bin");
exports.ast_etc_dir_path = path.join(exports.ast_dir_path, "etc", "asterisk");
exports.ast_main_conf_path = path.join(exports.ast_etc_dir_path, "asterisk.conf");
exports.ast_db_path = path.join(exports.working_directory_path, "asterisk.db");
exports.semasim_db_path = path.join(exports.working_directory_path, "semasim.db");
var keys_dir_path = path.join(exports.ast_etc_dir_path, "keys");
exports.ca_crt_path = path.join(keys_dir_path, "ca.crt");
exports.host_pem_path = path.join(keys_dir_path, "host.pem");
var ast_dir_link_path = "/usr/share/asterisk_semasim";
var uninstaller_link_path = "/usr/sbin/" + exports.srv_name + "_uninstaller";
exports.pidfile_path = path.join(exports.working_directory_path, "pid");
var env_file_path = path.join(exports.module_dir_path, "res", "env");
var to_distribute_rel_paths = [
    "LICENSE",
    "README.md",
    "res/" + path.basename(exports.ast_db_path),
    "res/" + path.basename(exports.semasim_db_path),
    "res/" + path.basename(env_file_path),
    "dist",
    "package.json"
];
exports.ast_sip_port = 48398;
exports.ld_library_path_for_asterisk = [
    path.join(exports.ast_dir_path, "lib"),
    path.join(exports.working_directory_path, "speexdsp", "lib"),
    path.join(exports.working_directory_path, "speex", "lib")
].join(":");
function getEnv() {
    if (getEnv.value !== undefined) {
        return getEnv.value;
    }
    var env = fs.readFileSync(env_file_path)
        .toString("utf8")
        .replace(/\s/g, "");
    assert(env === "DEV" || env === "PROD");
    getEnv.value = env;
    return getEnv();
}
exports.getEnv = getEnv;
(function (getEnv) {
    getEnv.value = undefined;
})(getEnv = exports.getEnv || (exports.getEnv = {}));
function getBaseDomain() {
    switch (getEnv()) {
        case "DEV": return "dev.semasim.com";
        case "PROD": return "semasim.com";
    }
}
exports.getBaseDomain = getBaseDomain;
var github_releases;
(function (github_releases) {
    var _this = this;
    github_releases.owner = "garronej";
    github_releases.repo = "releases";
    github_releases.project_tag = "semasim-gateway";
    github_releases.get_releases_index_url = function (tag) {
        if (tag === void 0) { tag = github_releases.project_tag; }
        return [
            "https://github.com",
            github_releases.owner,
            github_releases.repo,
            "releases",
            "download",
            tag,
            "index.json"
        ].join('/');
    };
    github_releases.fetch_releases_index = function (tag) { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, scriptLib.web_get(github_releases.get_releases_index_url(tag))];
                case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
            }
        });
    }); };
})(github_releases || (github_releases = {}));
function isFromTarball() {
    return !fs.existsSync(path.join(exports.module_dir_path, "src"));
}
function program_action_install() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, message, onSuccess, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("---Installing " + exports.srv_name + "---");
                    if (fs.existsSync(uninstaller_link_path) &&
                        path.dirname(scriptLib.sh_eval("readlink -f " + uninstaller_link_path)) !== exports.working_directory_path) {
                        process.stdout.write(scriptLib.colorize("Uninstalling previous instal found in other location... ", "YELLOW"));
                        scriptLib.execSync(uninstaller_link_path + " run");
                        console.log(scriptLib.colorize("DONE", "GREEN"));
                    }
                    uninstall();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, install()];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _c.sent();
                    message = _a.message;
                    console.log(scriptLib.colorize("An error occurred: '" + message, "RED"));
                    uninstall();
                    if (getEnv() === "PROD") {
                        scriptLib.execSync("rm -r " + exports.module_dir_path);
                    }
                    process.exit(-1);
                    return [2 /*return*/];
                case 4:
                    onSuccess = scriptLib.start_long_running_process("Starting Semasim").onSuccess;
                    _c.label = 5;
                case 5:
                    if (!true) return [3 /*break*/, 10];
                    _c.label = 6;
                case 6:
                    _c.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, scriptLib.exec("dongle list")];
                case 7:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 8:
                    _b = _c.sent();
                    return [3 /*break*/, 5];
                case 9: return [3 /*break*/, 10];
                case 10:
                    onSuccess("Started!");
                    console.log(scriptLib.colorize("Semasim is now up and running.", "GREEN"));
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
function program_action_uninstall() {
    console.log("---Uninstalling semasim---");
    uninstall("VERBOSE");
    console.log("---DONE---");
    if (fs.existsSync(installed_pkg_record_path)) {
        console.log([
            "NOTE: Some packages have been installed automatically, ",
            "you can remove them if you no longer need them.",
            "\n",
            "$ sudo apt-get purge " + require(installed_pkg_record_path).join(" "),
            "\n",
            "$ sudo apt-get --purge autoremove"
        ].join(""));
    }
    process.exit(0);
}
function update() {
    return __awaiter(this, void 0, void 0, function () {
        var getVersion, _a, version, versionStatus, _module_dir_path, releases_index, url, _loop_1, _b, _c, db_path, _working_directory_path_1, _d, _e, name, _f, _g, name, reinstall_script_path;
        var e_1, _h, e_2, _j, e_3, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    scriptLib.enableCmdTrace();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../lib/versionStatus"); })];
                case 1:
                    getVersion = (_l.sent()).getVersion;
                    return [4 /*yield*/, getVersion()];
                case 2:
                    _a = _l.sent(), version = _a.value, versionStatus = _a.status;
                    if (getEnv() === "DEV") {
                        console.log({ versionStatus: versionStatus });
                        return [2 /*return*/, "LAUNCH"];
                    }
                    if (!(versionStatus === "UP TO DATE")) return [3 /*break*/, 3];
                    console.log("Semasim is UP TO DATE");
                    return [3 /*break*/, 7];
                case 3:
                    if (!(versionStatus === "MINOR" || versionStatus === "PATCH")) return [3 /*break*/, 6];
                    console.log("Performing " + versionStatus + " update...");
                    _module_dir_path = path.join(exports.working_directory_path, path.basename(exports.module_dir_path));
                    return [4 /*yield*/, github_releases.fetch_releases_index()];
                case 4:
                    releases_index = _l.sent();
                    url = releases_index[version + "_" + scriptLib.sh_eval("uname -m")];
                    if (!url) {
                        throw new Error("Release " + version + " not published for arch");
                    }
                    return [4 /*yield*/, scriptLib.download_and_extract_tarball(url, _module_dir_path, "OVERWRITE IF EXIST")];
                case 5:
                    _l.sent();
                    _loop_1 = function (db_path) {
                        var _a = __read([exports.module_dir_path, _module_dir_path]
                            .map(function (v) { return path.join(v, "res", path.basename(db_path)); }), 2), db_schema_path = _a[0], _db_schema_path = _a[1];
                        if (!scriptLib.fs_areSame(db_schema_path, _db_schema_path)) {
                            console.log("Need db update " + db_path);
                            scriptLib.fs_move("COPY", _db_schema_path, db_path);
                            scriptLib.execSync("chown " + exports.unix_user + ":" + exports.unix_user + " " + db_path);
                        }
                    };
                    try {
                        for (_b = __values([exports.semasim_db_path, exports.ast_db_path]), _c = _b.next(); !_c.done; _c = _b.next()) {
                            db_path = _c.value;
                            _loop_1(db_path);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_h = _b.return)) _h.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    _working_directory_path_1 = path.join(_module_dir_path, path.basename(exports.working_directory_path));
                    scriptLib.execSyncTrace("chown -R " + exports.unix_user + ":" + exports.unix_user + " " + _working_directory_path_1);
                    scriptLib.fs_move("MOVE", exports.working_directory_path, _working_directory_path_1, "asterisk/etc");
                    try {
                        for (_d = __values(scriptLib.fs_ls(_working_directory_path_1)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            name = _e.value;
                            if (name === path.basename(exports.dongle_dir_path)) {
                                continue;
                            }
                            scriptLib.fs_move("MOVE", _working_directory_path_1, exports.working_directory_path, name);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_j = _d.return)) _j.call(_d);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (_f = __values(__spread(to_distribute_rel_paths, ["node_modules", "node"])), _g = _f.next(); !_g.done; _g = _f.next()) {
                            name = _g.value;
                            scriptLib.fs_move("MOVE", _module_dir_path, exports.module_dir_path, name);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_k = _f.return)) _k.call(_f);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    (function () {
                        var _dongle_dir_path = path.join(_working_directory_path_1, path.basename(exports.dongle_dir_path));
                        scriptLib.execSyncTrace(dongle.installer_cmd + " update --path " + _dongle_dir_path);
                    })();
                    scriptLib.execSyncTrace("rm -r " + _module_dir_path);
                    console.log(scriptLib.colorize("Update success", "GREEN"));
                    return [3 /*break*/, 7];
                case 6:
                    if (versionStatus === "MAJOR") {
                        console.log("Major update needed, re-installing semasim...");
                        reinstall_script_path = "/var/tmp/reinstall_semasim.sh";
                        scriptLib.createScript(reinstall_script_path, [
                            "#!/bin/bash",
                            "",
                            "CRON_FILE_PATH=/tmp/root_cron",
                            "CRON_LINE=\"@reboot " + reinstall_script_path + "\"",
                            "",
                            "cron_add () {",
                            "   cron_remove",
                            "   crontab -l -u root > $CRON_FILE_PATH",
                            "   echo $CRON_LINE >> $CRON_FILE_PATH",
                            "   crontab -u root $CRON_FILE_PATH",
                            "   rm $CRON_FILE_PATH",
                            "}",
                            "",
                            "cron_remove () {",
                            "   crontab -l -u root > $CRON_FILE_PATH",
                            "   awk -vLine=\"$CRON_LINE\" '!index($0,Line)' $CRON_FILE_PATH > \"$CRON_FILE_PATH\"_tmp",
                            "   mv \"$CRON_FILE_PATH\"_tmp $CRON_FILE_PATH",
                            "   crontab -u root $CRON_FILE_PATH",
                            "   rm $CRON_FILE_PATH",
                            "}",
                            "",
                            "cron_add",
                            uninstaller_link_path + " run",
                            "wget -q -O - https://gw.semasim.com/install.sh | sudo bash",
                            "cron_remove",
                            "rm " + reinstall_script_path,
                            ""
                        ].join("\n"));
                        scriptLib.spawnAndDetach("/bin/bash", [reinstall_script_path], undefined, "/tmp/semasim_reinstall.log");
                        return [2 /*return*/, "EXIT"];
                    }
                    _l.label = 7;
                case 7: return [2 /*return*/, "LAUNCH"];
            }
        });
    });
}
exports.update = update;
function program_action_release() {
    return __awaiter(this, void 0, void 0, function () {
        var tmp_dir_path, _module_dir_path, _ify, _node_modules_path, _working_directory_path, _dongle_node_path, _dongle_bin_dir_path, _ast_main_conf_path, _ast_dir_path, _ld_library_path_for_asterisk, to_distribute_rel_paths_1, to_distribute_rel_paths_1_1, name, arch, deps_digest_filename, deps_digest, node_modules_need_update, releases_index_file_path, releases_index, Version, last_version, previous_release_dir_path, _a, _b, name, _c, _d, name, module_file_path, version, tarball_file_path, putasset_dir_path, uploadAsset, tarball_file_url;
        var e_4, _e, e_5, _f, e_6, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    scriptLib.enableCmdTrace();
                    tmp_dir_path = path.join("/tmp", "semasim_release_" + Date.now());
                    scriptLib.execSyncTrace("rm -rf " + tmp_dir_path + " && mkdir " + tmp_dir_path);
                    _module_dir_path = path.join(tmp_dir_path, path.basename(exports.module_dir_path));
                    _ify = function (original_path) { return path.join(_module_dir_path, path.relative(exports.module_dir_path, original_path)); };
                    _node_modules_path = path.join(_module_dir_path, "node_modules");
                    _working_directory_path = _ify(exports.working_directory_path);
                    ;
                    _dongle_node_path = _ify(exports.dongle_node_path);
                    _dongle_bin_dir_path = _ify(exports.dongle_bin_dir_path);
                    _ast_main_conf_path = _ify(exports.ast_main_conf_path);
                    _ast_dir_path = _ify(exports.ast_dir_path);
                    _ld_library_path_for_asterisk = exports.ld_library_path_for_asterisk
                        .split(":")
                        .map(function (v) { return _ify(v); })
                        .join(":");
                    try {
                        for (to_distribute_rel_paths_1 = __values(to_distribute_rel_paths), to_distribute_rel_paths_1_1 = to_distribute_rel_paths_1.next(); !to_distribute_rel_paths_1_1.done; to_distribute_rel_paths_1_1 = to_distribute_rel_paths_1.next()) {
                            name = to_distribute_rel_paths_1_1.value;
                            scriptLib.fs_move("COPY", exports.module_dir_path, _module_dir_path, name);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (to_distribute_rel_paths_1_1 && !to_distribute_rel_paths_1_1.done && (_e = to_distribute_rel_paths_1.return)) _e.call(to_distribute_rel_paths_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    fs.writeFileSync(path.join(_module_dir_path, path.relative(exports.module_dir_path, env_file_path)), Buffer.from("PROD", "utf8"));
                    arch = scriptLib.sh_eval("uname -m");
                    deps_digest_filename = "dependencies.md5";
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("crypto"); })];
                case 1:
                    deps_digest = (_h.sent())
                        .createHash("md5")
                        .update(Buffer.from(JSON.stringify(require(path.join(exports.module_dir_path, "package-lock.json"))["dependencies"]), "utf8"))
                        .digest("hex");
                    releases_index_file_path = path.join(tmp_dir_path, path.basename(github_releases.get_releases_index_url()));
                    return [4 /*yield*/, github_releases.fetch_releases_index()];
                case 2:
                    releases_index = _h.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../lib/versionStatus"); })];
                case 3:
                    Version = (_h.sent()).Version;
                    last_version = Object.keys(releases_index)
                        .map(function (str) { return str.match(/^([^_]+)_(.+)$/).slice(1); })
                        .filter(function (_a) {
                        var _b = __read(_a, 2), _ = _b[0], arch_ = _b[1];
                        return arch_ === arch;
                    })
                        .map(function (_a) {
                        var _b = __read(_a, 1), vStr = _b[0];
                        return Version.parse(vStr);
                    })
                        .sort(Version.compare)
                        .pop();
                    console.log({ last_version: last_version });
                    previous_release_dir_path = path.join(tmp_dir_path, "previous_release");
                    if (!(last_version === undefined)) return [3 /*break*/, 4];
                    node_modules_need_update = true;
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, scriptLib.download_and_extract_tarball(releases_index[Version.stringify(last_version) + "_" + arch], previous_release_dir_path, "OVERWRITE IF EXIST")];
                case 5:
                    _h.sent();
                    node_modules_need_update = fs.readFileSync(path.join(previous_release_dir_path, deps_digest_filename)).toString("utf8") !== deps_digest;
                    _h.label = 6;
                case 6:
                    if (!node_modules_need_update) {
                        console.log("node_modules haven't change since last release");
                        try {
                            for (_a = __values(["node_modules", "node", deps_digest_filename]), _b = _a.next(); !_b.done; _b = _a.next()) {
                                name = _b.value;
                                scriptLib.execSyncTrace("mv " + name + " " + _module_dir_path, { "cwd": previous_release_dir_path });
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    else {
                        console.log("Need to update node_module");
                        scriptLib.execSyncTrace([
                            "sudo",
                            "env \"PATH=" + path.dirname(process.argv[0]) + ":" + process.env["PATH"] + "\"",
                            "npm install --unsafe-perm",
                        ].join(" "), { "cwd": _module_dir_path });
                        scriptLib.execSyncTrace("rm package-lock.json", { "cwd": _module_dir_path });
                        try {
                            for (_c = __values(["@types", "typescript"]), _d = _c.next(); !_d.done; _d = _c.next()) {
                                name = _d.value;
                                scriptLib.execSyncTrace("rm -r " + path.join(_node_modules_path, name));
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_g = _c.return)) _g.call(_c);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        fs.writeFileSync(path.join(_module_dir_path, deps_digest_filename), Buffer.from(deps_digest, "utf8"));
                        scriptLib.execSyncTrace("find " + _node_modules_path + " -type f -name \"*.ts\" -exec rm -rf {} \\;");
                        (function hide_auth_token() {
                            var e_7, _a;
                            var files = scriptLib.execSync("find . -name \"package-lock.json\" -o -name \"package.json\"", { "cwd": _module_dir_path })
                                .slice(0, -1)
                                .split("\n")
                                .map(function (rp) { return path.join(_module_dir_path, rp); });
                            try {
                                for (var files_1 = __values(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                                    var file = files_1_1.value;
                                    fs.writeFileSync(file, Buffer.from(fs.readFileSync(file)
                                        .toString("utf8")
                                        .replace(/[0-9a-f]+:x-oauth-basic/g, "xxxxxxxxxxxxxxxx"), "utf8"));
                                }
                            }
                            catch (e_7_1) { e_7 = { error: e_7_1 }; }
                            finally {
                                try {
                                    if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                                }
                                finally { if (e_7) throw e_7.error; }
                            }
                        })();
                    }
                    return [4 /*yield*/, fetch_asterisk_and_dongle(_working_directory_path)];
                case 7:
                    _h.sent();
                    module_file_path = path.join(_working_directory_path, "asterisk", "lib", "asterisk", "modules", "chan_dongle.so");
                    if (!fs.existsSync(previous_release_dir_path)) return [3 /*break*/, 8];
                    console.log("Copying chan-dongle.so from previous release");
                    scriptLib.fs_move("MOVE", path.join(previous_release_dir_path, "working_directory"), _working_directory_path, module_file_path);
                    return [3 /*break*/, 10];
                case 8:
                    console.log("Compiling chan-dongle.so");
                    return [4 /*yield*/, installAsteriskPrereq()];
                case 9:
                    _h.sent();
                    fs.writeFileSync(_ast_main_conf_path, Buffer.from(buildAsteriskMainConfigFile(_ast_dir_path), "utf8"));
                    scriptLib.execSyncTrace([
                        _dongle_node_path + " " + path.join(_dongle_bin_dir_path, "installer.js") + " build-asterisk-chan-dongle",
                        "--dest_dir " + path.dirname(module_file_path),
                        "--asterisk_main_conf " + _ast_main_conf_path,
                        "--ast_include_dir_path " + path.join(_ast_dir_path, "include"),
                        "--ld_library_path_for_asterisk " + _ld_library_path_for_asterisk
                    ].join(" "));
                    scriptLib.execSyncTrace("rm " + _ast_main_conf_path);
                    _h.label = 10;
                case 10:
                    version = require(path.join(exports.module_dir_path, "package.json")).version;
                    tarball_file_path = path.join(tmp_dir_path, "semasim_" + version + "_" + arch + ".tar.gz");
                    scriptLib.execSyncTrace([
                        "tar -czf",
                        tarball_file_path,
                        "-C " + _module_dir_path + " ."
                    ].join(" "));
                    putasset_dir_path = path.join(tmp_dir_path, "node-putasset");
                    scriptLib.execSyncTrace("git clone https://github.com/garronej/node-putasset", { "cwd": path.join(putasset_dir_path, "..") });
                    scriptLib.execSyncTrace([
                        "sudo",
                        "env \"PATH=" + path.dirname(process.argv[0]) + ":" + process.env["PATH"] + "\"",
                        "npm install --production --unsafe-perm",
                    ].join(" "), { "cwd": putasset_dir_path });
                    uploadAsset = function (file_path) { return scriptLib.sh_eval([
                        process.argv[0] + " " + path.join(putasset_dir_path, "bin", "putasset.js"),
                        "-k " + fs.readFileSync(path.join(exports.module_dir_path, "res", "PUTASSET_TOKEN"))
                            .toString("utf8")
                            .replace(/\s/g, ""),
                        "-r " + github_releases.repo,
                        "-o " + github_releases.owner,
                        "-t " + github_releases.project_tag,
                        "-f \"" + file_path + "\"",
                        "--force"
                    ].join(" ")); };
                    console.log("Start uploading...");
                    tarball_file_url = uploadAsset(tarball_file_path);
                    return [4 /*yield*/, github_releases.fetch_releases_index()];
                case 11:
                    releases_index = _h.sent();
                    releases_index[version + "_" + arch] = tarball_file_url;
                    fs.writeFileSync(releases_index_file_path, Buffer.from(JSON.stringify(releases_index, null, 2), "utf8"));
                    uploadAsset(releases_index_file_path);
                    scriptLib.execSync("rm -r " + tmp_dir_path);
                    console.log("---DONE---");
                    return [2 /*return*/];
            }
        });
    });
}
function install() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    scriptLib.unixUser.create(exports.unix_user, exports.working_directory_path);
                    if (!!isFromTarball()) return [3 /*break*/, 2];
                    if (!fs.existsSync(exports.node_path)) {
                        throw new Error("Missing local copy of node");
                    }
                    scriptLib.enableCmdTrace();
                    return [4 /*yield*/, fetch_asterisk_and_dongle(exports.working_directory_path)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, installAsteriskPrereq()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (function configure_asterisk() {
                            return __awaiter(this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            fs.writeFileSync(exports.ast_main_conf_path, Buffer.from(buildAsteriskMainConfigFile(ast_dir_link_path), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "rtp.conf"), Buffer.from([
                                                "[general]",
                                                "icesupport=yes",
                                                "stunaddr=cname_stun_19302.semasim.com:19302",
                                                ""
                                            ].join("\n"), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "res_odbc.conf"), Buffer.from([
                                                "[" + odbc.connection_name + "]",
                                                "enabled => yes",
                                                "dsn => " + odbc.connection_name,
                                                "pre-connect => yes",
                                                ""
                                            ].join("\n"), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "sorcery.conf"), Buffer.from([
                                                "[res_pjsip]",
                                                "endpoint=realtime,ps_endpoints",
                                                "auth=realtime,ps_auths",
                                                "aor=realtime,ps_aors",
                                                "domain_alias=realtime,ps_domain_aliases",
                                                "contact=realtime,ps_contacts",
                                                "",
                                                "[res_pjsip_endpoint_identifier_ip]",
                                                "identify=realtime,ps_endpoint_id_ips",
                                                ""
                                            ].join("\n"), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "extconfig.conf"), Buffer.from([
                                                "[settings]",
                                                "ps_endpoints => odbc," + odbc.connection_name,
                                                "ps_auths => odbc," + odbc.connection_name,
                                                "ps_aors => odbc," + odbc.connection_name,
                                                "ps_domain_aliases => odbc," + odbc.connection_name,
                                                "ps_endpoint_id_ips => odbc," + odbc.connection_name,
                                                "ps_contacts => odbc," + odbc.connection_name,
                                                ""
                                            ].join("\n"), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "pjsip.conf"), Buffer.from([
                                                "[transport-tcp]",
                                                "type=transport",
                                                "protocol=tcp",
                                                "bind=0.0.0.0:" + exports.ast_sip_port,
                                                ""
                                            ].join("\n"), "utf8"));
                                            fs.writeFileSync(path.join(exports.ast_etc_dir_path, "modules.conf"), Buffer.from([
                                                "[modules]",
                                                "autoload=yes",
                                                ""
                                            ].join("\n"), "utf8"));
                                            scriptLib.execSync("chmod 640 " + exports.ast_etc_dir_path + "/*");
                                            return [4 /*yield*/, (function generate_dtls_certs() {
                                                    return __awaiter(this, void 0, void 0, function () {
                                                        var _a, exec, onSuccess, host_cfg_path, ca_cfg_path, passphrase, ca_key_path, validity_days, host_key_path, host_csr_path, host_crt_path;
                                                        return __generator(this, function (_b) {
                                                            switch (_b.label) {
                                                                case 0: return [4 /*yield*/, scriptLib.apt_get_install("openssl")];
                                                                case 1:
                                                                    _b.sent();
                                                                    _a = scriptLib.start_long_running_process("Generating TLS certificates"), exec = _a.exec, onSuccess = _a.onSuccess;
                                                                    return [4 /*yield*/, exec("mkdir " + keys_dir_path)];
                                                                case 2:
                                                                    _b.sent();
                                                                    host_cfg_path = path.join(keys_dir_path, "host.cfg");
                                                                    fs.writeFileSync(host_cfg_path, Buffer.from([
                                                                        "[req]",
                                                                        "distinguished_name = req_distinguished_name",
                                                                        "prompt = no",
                                                                        "",
                                                                        "[req_distinguished_name]",
                                                                        "CN=web." + getBaseDomain(),
                                                                        "O=Semasim user gateway",
                                                                        ""
                                                                    ].join("\n"), "utf8"));
                                                                    ca_cfg_path = path.join(keys_dir_path, "ca.cfg");
                                                                    fs.writeFileSync(ca_cfg_path, Buffer.from([
                                                                        "[req]",
                                                                        "distinguished_name = req_distinguished_name",
                                                                        "prompt = no",
                                                                        "",
                                                                        "[req_distinguished_name]",
                                                                        "CN=Asterisk Private CA",
                                                                        "O=Semasim user gateway",
                                                                        "",
                                                                        "[ext]",
                                                                        "basicConstraints=CA:TRUE",
                                                                        ""
                                                                    ].join("\n"), "utf8"));
                                                                    passphrase = "unsafe_ok_for_the_use_case";
                                                                    ca_key_path = path.join(keys_dir_path, "ca.key");
                                                                    return [4 /*yield*/, exec([
                                                                            "openssl genrsa",
                                                                            "-des3",
                                                                            "-passout pass:" + passphrase,
                                                                            "-out " + ca_key_path,
                                                                            "4096"
                                                                        ].join(" "))];
                                                                case 3:
                                                                    _b.sent();
                                                                    validity_days = 24853;
                                                                    return [4 /*yield*/, exec([
                                                                            "openssl req",
                                                                            "-new",
                                                                            "-config " + ca_cfg_path,
                                                                            "-x509",
                                                                            "-days " + validity_days,
                                                                            "-key " + ca_key_path + " -passin pass:" + passphrase,
                                                                            "-out " + exports.ca_crt_path
                                                                        ].join(" "))];
                                                                case 4:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("rm " + ca_cfg_path)];
                                                                case 5:
                                                                    _b.sent();
                                                                    host_key_path = path.join(keys_dir_path, "host.key");
                                                                    return [4 /*yield*/, exec("openssl genrsa -out " + host_key_path + " 1024")];
                                                                case 6:
                                                                    _b.sent();
                                                                    host_csr_path = path.join(keys_dir_path, "host.csr");
                                                                    return [4 /*yield*/, exec([
                                                                            "openssl req",
                                                                            "-batch",
                                                                            "-new",
                                                                            "-config " + host_cfg_path,
                                                                            "-key " + host_key_path,
                                                                            "-out " + host_csr_path
                                                                        ].join(" "))];
                                                                case 7:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("rm " + host_cfg_path)];
                                                                case 8:
                                                                    _b.sent();
                                                                    host_crt_path = path.join(keys_dir_path, "host.crt");
                                                                    return [4 /*yield*/, exec([
                                                                            "openssl x509",
                                                                            "-req",
                                                                            "-days " + validity_days,
                                                                            "-in " + host_csr_path,
                                                                            "-CA " + exports.ca_crt_path,
                                                                            "-CAkey " + ca_key_path + " -passin pass:" + passphrase,
                                                                            "-set_serial 01",
                                                                            "-out " + host_crt_path
                                                                        ].join(" "))];
                                                                case 9:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("rm " + ca_key_path + " " + host_csr_path)];
                                                                case 10:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("cat " + host_key_path + " > " + exports.host_pem_path)];
                                                                case 11:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("cat " + host_crt_path + " >> " + exports.host_pem_path)];
                                                                case 12:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("rm " + host_key_path + " " + host_crt_path)];
                                                                case 13:
                                                                    _b.sent();
                                                                    return [4 /*yield*/, exec("chmod 600 " + exports.host_pem_path)];
                                                                case 14:
                                                                    _b.sent();
                                                                    onSuccess();
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    });
                                                })()];
                                        case 1:
                                            _a.sent();
                                            odbc.configure();
                                            scriptLib.createSymlink(exports.ast_dir_path, ast_dir_link_path);
                                            scriptLib.fs_move("COPY", path.join(exports.module_dir_path, "res"), exports.working_directory_path, exports.ast_db_path);
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        })()];
                case 4:
                    _a.sent();
                    scriptLib.fs_move("COPY", path.join(exports.module_dir_path, "res"), exports.working_directory_path, exports.semasim_db_path);
                    shellScripts.create();
                    scriptLib.execSync("chown -R " + exports.unix_user + ":" + exports.unix_user + " " + exports.working_directory_path);
                    dongle.install();
                    scriptLib.systemd.createConfigFile(exports.srv_name, path.join(__dirname, "main.js"), exports.node_path, "ENABLE", "START");
                    return [2 /*return*/];
            }
        });
    });
}
function uninstall(verbose) {
    if (verbose === void 0) { verbose = false; }
    var write = !!verbose ? process.stdout.write.bind(process.stdout) : (function () { });
    var log = function (str) { return write(str + "\n"); };
    var runRecover = function (description, action) {
        write(description);
        try {
            action();
            log(scriptLib.colorize("ok", "GREEN"));
        }
        catch (_a) {
            var message = _a.message;
            log(scriptLib.colorize(message, "RED"));
        }
    };
    runRecover("Terminating running instance ... ", function () { return scriptLib.stopProcessSync(exports.pidfile_path, "SIGUSR2"); });
    runRecover("Removing systemd service ... ", function () { return scriptLib.systemd.deleteConfigFile(exports.srv_name); });
    runRecover("Uninstalling chan_dongle_extended ...", function () { return dongle.uninstall(); });
    runRecover("Restoring odbc ... ", function () { return odbc.restore(); });
    runRecover("Removing uninstaller from path ...", function () { return shellScripts.remove_symbolic_links(); });
    runRecover("Deleting run link to internal asterisk ... ", function () { return scriptLib.execSyncQuiet("rm -r " + ast_dir_link_path); });
    runRecover("Deleting unix user ... ", function () { return scriptLib.unixUser.remove(exports.unix_user); });
    if (!isFromTarball()) {
        runRecover("Deleting working directory ... ", function () { return scriptLib.execSyncQuiet("rm -r " + exports.working_directory_path); });
    }
}
/** Create dir if does not exist, keep the files in it if it does */
function fetch_asterisk_and_dongle(dest_dir_path) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, releases_index_asterisk, releases_index_dongle, arch;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all((function () {
                        var tags = ["asterisk", "chan-dongle-extended"];
                        return tags;
                    })()
                        .map(function (tag) { return github_releases.fetch_releases_index(tag); }))];
                case 1:
                    _a = __read.apply(void 0, [_b.sent(), 2]), releases_index_asterisk = _a[0], releases_index_dongle = _a[1];
                    arch = scriptLib.sh_eval("uname -m");
                    return [4 /*yield*/, Promise.all([
                            scriptLib.download_and_extract_tarball(releases_index_asterisk[arch], dest_dir_path, "MERGE"),
                            scriptLib.download_and_extract_tarball(releases_index_dongle[releases_index_dongle[arch]], path.join(dest_dir_path, path.basename(exports.dongle_dir_path)), "OVERWRITE IF EXIST")
                        ])];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function installAsteriskPrereq() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, package_name, e_8_1, debArch, package_name, dl_path, file_path;
        var e_8, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, 6, 7]);
                    _a = __values([
                        "libuuid1",
                        "libjansson4",
                        "libxml2",
                        "libsqlite3-0",
                        "unixodbc",
                        "libsrtp0"
                    ]), _b = _a.next();
                    _d.label = 1;
                case 1:
                    if (!!_b.done) return [3 /*break*/, 4];
                    package_name = _b.value;
                    return [4 /*yield*/, scriptLib.apt_get_install(package_name)];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _b = _a.next();
                    return [3 /*break*/, 1];
                case 4: return [3 /*break*/, 7];
                case 5:
                    e_8_1 = _d.sent();
                    e_8 = { error: e_8_1 };
                    return [3 /*break*/, 7];
                case 6:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_8) throw e_8.error; }
                    return [7 /*endfinally*/];
                case 7:
                    debArch = (function () {
                        var arch = scriptLib.sh_eval("uname -m");
                        if (arch === "i686") {
                            return "i386";
                        }
                        if (arch === "x86_64") {
                            return "amd64";
                        }
                        if (!!arch.match(/^arm/)) {
                            return "armhf";
                        }
                        throw new Error(arch + " proc not supported");
                    })();
                    package_name = "libsqliteodbc";
                    if (!scriptLib.sh_if("apt-get install --dry-run " + package_name)) return [3 /*break*/, 9];
                    return [4 /*yield*/, scriptLib.apt_get_install(package_name)];
                case 8:
                    _d.sent();
                    return [3 /*break*/, 11];
                case 9:
                    dl_path = "/s/sqliteodbc/libsqliteodbc_0.9995-1_" + debArch + ".deb";
                    file_path = path.basename(dl_path);
                    return [4 /*yield*/, scriptLib.web_get("http://http.us.debian.org/debian/pool/main" + dl_path, file_path)];
                case 10:
                    _d.sent();
                    scriptLib.execSync("dpkg -i " + file_path);
                    scriptLib.execSync("rm " + file_path);
                    scriptLib.apt_get_install.onInstallSuccess(package_name);
                    _d.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function buildAsteriskMainConfigFile(origin_dir_path) {
    return [
        "[directories](!)",
        "astetcdir => " + origin_dir_path + "/etc/asterisk",
        "astmoddir => " + origin_dir_path + "/lib/asterisk/modules",
        "astvarlibdir => " + origin_dir_path + "/var/lib/asterisk",
        "astdbdir => " + origin_dir_path + "/var/lib/asterisk",
        "astkeydir => " + origin_dir_path + "/var/lib/asterisk",
        "astdatadir => " + origin_dir_path + "/var/lib/asterisk",
        "astagidir => " + origin_dir_path + "/var/lib/asterisk/agi-bin",
        "astspooldir => " + origin_dir_path + "/var/spool/asterisk",
        "astrundir => " + origin_dir_path + "/var/run/asterisk",
        "astlogdir => " + origin_dir_path + "/var/log/asterisk",
        "astsbindir => " + origin_dir_path + "/sbin",
        "",
        "[options]",
        "documentation_language = en_US",
        "",
        "[modules]",
        "preload => res_odbc.so",
        "preload => res_config_odbc.so",
        ""
    ].join("\n");
}
var odbc;
(function (odbc) {
    odbc.connection_name = "semasim_asterisk";
    var odbc_config_path = "/etc/odbc.ini";
    function configure() {
        var ini = require("ini-extended").ini;
        var parsed_odbc_conf = ini.parseStripWhitespace(fs.readFileSync(odbc_config_path).toString("utf8"));
        parsed_odbc_conf[odbc.connection_name] = {
            "Description": 'SQLite3 connection to ‘asterisk’ database for semasim',
            "Driver": 'SQLite3',
            "Database": exports.ast_db_path,
            "Timeout": '2000'
        };
        fs.writeFileSync(odbc_config_path, Buffer.from(ini.stringify(parsed_odbc_conf), "utf8"));
    }
    odbc.configure = configure;
    function restore() {
        var ini = require("ini-extended").ini;
        var parsed_odbc_conf = ini.parseStripWhitespace(fs.readFileSync(odbc_config_path).toString("utf8"));
        delete parsed_odbc_conf[odbc.connection_name];
        fs.writeFileSync(odbc_config_path, Buffer.from(ini.stringify(parsed_odbc_conf), "utf8"));
    }
    odbc.restore = restore;
})(odbc || (odbc = {}));
var dongle;
(function (dongle) {
    dongle.installer_cmd = exports.dongle_node_path + " " + path.join(exports.dongle_bin_dir_path, "installer.js");
    function install() {
        scriptLib.execSyncTrace([
            dongle.installer_cmd + " install",
            "--asterisk_main_conf " + exports.ast_main_conf_path,
            "--disable_sms_dialplan",
            "--ast_include_dir_path " + path.join(exports.ast_dir_path, "include"),
            "--enable_ast_ami_on_port 48397",
            "--unix_user " + exports.unix_user,
            "--do_not_create_systemd_conf",
            "--allow_host_reboot_on_dongle_unrecoverable_crash",
            isFromTarball() ? "--assume_chan_dongle_installed" : "",
            "--ld_library_path_for_asterisk " + exports.ld_library_path_for_asterisk
        ].join(" "));
        (function merge_installed_pkg() {
            var e_9, _a;
            var dongle_installed_pkg_record = path.join(exports.dongle_dir_path, path.basename(installed_pkg_record_path));
            if (fs.existsSync(dongle_installed_pkg_record)) {
                var pkg_list = require(dongle_installed_pkg_record);
                try {
                    for (var pkg_list_1 = __values(pkg_list), pkg_list_1_1 = pkg_list_1.next(); !pkg_list_1_1.done; pkg_list_1_1 = pkg_list_1.next()) {
                        var pkg_name = pkg_list_1_1.value;
                        scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, pkg_name);
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (pkg_list_1_1 && !pkg_list_1_1.done && (_a = pkg_list_1.return)) _a.call(pkg_list_1);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
            }
        })();
    }
    dongle.install = install;
    function uninstall() {
        scriptLib.execSyncQuiet(dongle.installer_cmd + " uninstall");
    }
    dongle.uninstall = uninstall;
})(dongle = exports.dongle || (exports.dongle = {}));
var shellScripts;
(function (shellScripts) {
    function create() {
        process.stdout.write("Creating shell scripts ... ");
        scriptLib.createScript(path.join(exports.working_directory_path, "asterisk_cli.sh"), [
            "#!/usr/bin/env bash",
            "",
            "# This script connect to the CLI of Semasim's Asterisk instance.",
            "",
            "cd " + path.join(exports.ast_dir_path, "var", "lib", "asterisk"),
            "su -s $(which bash) -c \"LD_LIBRARY_PATH=" + exports.ld_library_path_for_asterisk + " " + exports.ast_path + " -rvvvvvv -C " + exports.ast_main_conf_path + "\" " + exports.unix_user,
            ""
        ].join("\n"));
        var uninstaller_sh_path = path.join(exports.working_directory_path, "uninstaller.sh");
        scriptLib.createScript(uninstaller_sh_path, [
            "#!/usr/bin/env bash",
            "",
            "# Will uninstall the service and remove source if installed from tarball",
            "",
            "if [ \"$1\" == \"run\" ]",
            "then",
            "   if [[ $EUID -ne 0 ]]; then",
            "       echo \"This script require root privileges.\"",
            "       exit 1",
            "   fi",
            "   " + exports.node_path + " " + __filename + " uninstall",
            "   " + (getEnv() === "PROD" ? "rm -r " + exports.module_dir_path : ""),
            "else",
            "   echo \"If you wish to uninstall chan-dongle-extended call this script with 'run' as argument:\"",
            "   echo \"$0 run\"",
            "fi",
            ""
        ].join("\n"));
        scriptLib.createSymlink(uninstaller_sh_path, uninstaller_link_path);
        console.log(scriptLib.colorize("OK", "GREEN"));
    }
    shellScripts.create = create;
    function remove_symbolic_links() {
        scriptLib.execSyncQuiet("rm -f " + uninstaller_link_path);
    }
    shellScripts.remove_symbolic_links = remove_symbolic_links;
})(shellScripts || (shellScripts = {}));
if (require.main === module) {
    process.once("unhandledRejection", function (error) { throw error; });
    scriptLib.exit_if_not_root();
    scriptLib.apt_get_install.onInstallSuccess = function (package_name) {
        return scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, package_name);
    };
    Promise.resolve().then(function () { return require("commander"); }).then(function (program) {
        program
            .command("install")
            .action(function () { return program_action_install(); });
        program
            .command("uninstall")
            .action(function () { return program_action_uninstall(); });
        program
            .command("release")
            .action(function () { return program_action_release(); });
        program.parse(process.argv);
    });
}
