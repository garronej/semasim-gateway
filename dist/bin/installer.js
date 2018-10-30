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
const fs = require("fs");
const path = require("path");
const scriptLib = require("scripting-tools");
const ini_extended_1 = require("ini-extended");
exports.module_dir_path = path.join(__dirname, "..", "..");
exports.unix_user = "semasim";
exports.srv_name = "semasim";
exports.working_directory_path = path.join(exports.module_dir_path, "working_directory");
exports.node_path = path.join(exports.module_dir_path, "node");
const installed_pkg_record_path = path.join(exports.module_dir_path, "pkg_installed.json");
exports.ast_dir_path = path.join(exports.working_directory_path, "asterisk");
exports.ast_path = path.join(exports.ast_dir_path, "sbin", "asterisk");
exports.dongle_dir_path = path.join(exports.working_directory_path, "dongle");
exports.dongle_node_path = path.join(exports.dongle_dir_path, "node");
exports.dongle_bin_dir_path = path.join(exports.dongle_dir_path, "dist", "bin");
exports.ast_etc_dir_path = path.join(exports.ast_dir_path, "etc", "asterisk");
exports.ast_main_conf_path = path.join(exports.ast_etc_dir_path, "asterisk.conf");
exports.ast_db_path = path.join(exports.working_directory_path, "asterisk.db");
exports.semasim_db_path = path.join(exports.working_directory_path, "semasim.db");
const keys_dir_path = path.join(exports.ast_etc_dir_path, "keys");
exports.ca_crt_path = path.join(keys_dir_path, "ca.crt");
exports.host_pem_path = path.join(keys_dir_path, "host.pem");
const ast_dir_link_path = "/usr/share/asterisk_semasim";
const uninstaller_link_path = `/usr/sbin/${exports.srv_name}_uninstaller`;
exports.pidfile_path = path.join(exports.working_directory_path, "pid");
const env_file_path = path.join(exports.module_dir_path, "env");
const to_distribute_rel_paths = [
    "LICENSE",
    "README.md",
    `res/${path.basename(exports.ast_db_path)}`,
    `res/${path.basename(exports.semasim_db_path)}`,
    `res/${path.basename(env_file_path)}`,
    "dist",
    "node_modules",
    "package.json",
    path.basename(exports.node_path)
];
path.relative;
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
    const env = fs.readFileSync(env_file_path)
        .toString("utf8")
        .replace(/\s/g, "");
    console.assert(env === "DEV" || env === "PROD");
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
function program_action_install() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`---Installing ${exports.srv_name}---`);
        if (fs.existsSync(uninstaller_link_path) &&
            path.dirname(scriptLib.sh_eval(`readlink -f ${uninstaller_link_path}`)) !== exports.working_directory_path) {
            process.stdout.write(scriptLib.colorize("Uninstalling previous instal found in other location... ", "YELLOW"));
            scriptLib.execSync(`${uninstaller_link_path} run`);
            console.log(scriptLib.colorize("DONE", "GREEN"));
        }
        uninstall();
        try {
            yield install();
        }
        catch ({ message }) {
            console.log(scriptLib.colorize(`An error occurred: '${message}`, "RED"));
            uninstall();
            if (getEnv() === "PROD") {
                scriptLib.execSync(`rm -r ${exports.module_dir_path}`);
            }
            process.exit(-1);
            return;
        }
        const { onSuccess } = scriptLib.start_long_running_process("Starting Semasim");
        while (true) {
            try {
                yield scriptLib.exec("dongle list");
            }
            catch (_a) {
                continue;
            }
            break;
        }
        onSuccess("Started!");
        console.log(scriptLib.colorize(`Semasim is now running, you can go to ${getBaseDomain()} to register your SIM cards.`, "GREEN"));
        process.exit(0);
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
            `$ sudo apt-get purge ${require(installed_pkg_record_path).join(" ")}`,
            "\n",
            `$ sudo apt-get --purge autoremove`
        ].join(""));
    }
    process.exit(0);
}
function program_action_update() {
    return __awaiter(this, void 0, void 0, function* () {
        scriptLib.enableCmdTrace();
        const { getVersionStatus } = yield Promise.resolve().then(() => require("../lib/versionStatus"));
        const versionStatus = yield getVersionStatus();
        if (getEnv() === "DEV") {
            console.log({ versionStatus });
            return "LAUNCH";
        }
        if (versionStatus === "UP TO DATE") {
            console.log("Semasim is UP TO DATE");
        }
        else if (versionStatus === "MINOR" || versionStatus === "PATCH") {
            console.log(`Performing ${versionStatus} update...`);
            const _module_dir_path = path.join(exports.working_directory_path, path.basename(exports.module_dir_path));
            yield scriptLib.download_and_extract_tarball(`${getBaseDomain()}/semasim_${scriptLib.sh_eval("uname -m")}.tar.gz`, _module_dir_path, "OVERWRITE IF EXIST");
            for (const db_path of [exports.semasim_db_path, exports.ast_db_path]) {
                const [db_schema_path, _db_schema_path] = [exports.module_dir_path, _module_dir_path].map(v => path.join(v, "res", path.basename(db_path)));
                if (!scriptLib.fs_areSame(db_schema_path, _db_schema_path)) {
                    console.log(`Need db update ${db_path}`);
                    scriptLib.fs_move("COPY", _db_schema_path, db_path);
                    scriptLib.execSync(`chown ${exports.unix_user}:${exports.unix_user} ${db_path}`);
                }
            }
            const _working_directory_path = path.join(_module_dir_path, path.basename(exports.working_directory_path));
            scriptLib.execSyncTrace(`chown -R ${exports.unix_user}:${exports.unix_user} ${_working_directory_path}`);
            scriptLib.fs_move("MOVE", exports.working_directory_path, _working_directory_path, "asterisk/etc");
            for (const name of scriptLib.fs_ls(_working_directory_path)) {
                if (name === path.basename(exports.dongle_dir_path)) {
                    continue;
                }
                scriptLib.fs_move("MOVE", _working_directory_path, exports.working_directory_path, name);
            }
            for (const name of to_distribute_rel_paths) {
                scriptLib.fs_move("MOVE", _module_dir_path, exports.module_dir_path, name);
            }
            (() => {
                const _dongle_dir_path = path.join(_working_directory_path, path.basename(exports.dongle_dir_path));
                scriptLib.execSyncTrace(`${dongle.installer_cmd} update --path ${_dongle_dir_path}`);
            })();
            scriptLib.execSyncTrace(`rm -r ${_module_dir_path}`);
            console.log(scriptLib.colorize("Update success", "GREEN"));
        }
        else if (versionStatus === "MAJOR") {
            console.log("Major update needed, re-installing semasim...");
            const reinstall_script_path = "/var/tmp/reinstall_semasim.sh";
            scriptLib.createScript(reinstall_script_path, [
                `#!/bin/bash`,
                ``,
                `CRON_FILE_PATH=/tmp/root_cron`,
                `CRON_LINE="@reboot ${reinstall_script_path}"`,
                ``,
                `cron_add () {`,
                `   cron_remove`,
                `   crontab -l -u root > $CRON_FILE_PATH`,
                `   echo $CRON_LINE >> $CRON_FILE_PATH`,
                `   crontab -u root $CRON_FILE_PATH`,
                `   rm $CRON_FILE_PATH`,
                `}`,
                ``,
                `cron_remove () {`,
                `   crontab -l -u root > $CRON_FILE_PATH`,
                `   awk -vLine="$CRON_LINE" '!index($0,Line)' $CRON_FILE_PATH > "$CRON_FILE_PATH"_tmp`,
                `   mv "$CRON_FILE_PATH"_tmp $CRON_FILE_PATH`,
                `   crontab -u root $CRON_FILE_PATH`,
                `   rm $CRON_FILE_PATH`,
                `}`,
                ``,
                `cron_add`,
                `${uninstaller_link_path} run`,
                `wget -q -O - ${getBaseDomain()}/installer.sh | sudo bash`,
                `cron_remove`,
                `rm ${reinstall_script_path}`,
                ``
            ].join("\n"));
            scriptLib.spawnAndDetach("/bin/bash", [reinstall_script_path], undefined, "/tmp/semasim_reinstall.log");
            return "EXIT";
        }
        return "LAUNCH";
    });
}
exports.program_action_update = program_action_update;
function program_action_tarball() {
    return __awaiter(this, void 0, void 0, function* () {
        scriptLib.enableCmdTrace();
        if (!fs.existsSync(exports.node_path)) {
            throw new Error(`Missing node`);
        }
        const _module_dir_path = path.join("/tmp", path.basename(exports.module_dir_path));
        scriptLib.execSyncTrace(`rm -rf ${_module_dir_path}`);
        for (const name of to_distribute_rel_paths) {
            scriptLib.fs_move("COPY", exports.module_dir_path, _module_dir_path, name);
        }
        fs.writeFileSync(path.join(_module_dir_path, path.relative(exports.module_dir_path, env_file_path)), Buffer.from("PROD", "utf8"));
        const _node_modules_path = path.join(_module_dir_path, "node_modules");
        for (const name of ["@types", "typescript"]) {
            scriptLib.execSyncTrace(`rm -r ${path.join(_node_modules_path, name)}`);
        }
        scriptLib.execSyncTrace(`find ${_node_modules_path} -type f -name "*.ts" -exec rm -rf {} \\;`);
        const _working_directory_path = path.join(_module_dir_path, path.basename(exports.working_directory_path));
        yield fetch_asterisk_and_dongle(_working_directory_path);
        scriptLib.fs_move("COPY", exports.working_directory_path, _working_directory_path, "asterisk/lib/asterisk/modules/chan_dongle.so");
        scriptLib.execSyncTrace([
            "tar -czf",
            path.join(exports.module_dir_path, `semasim_${scriptLib.sh_eval("uname -m")}.tar.gz`),
            `-C ${_module_dir_path} .`
        ].join(" "));
        scriptLib.execSyncTrace(`rm -r ${_module_dir_path}`);
    });
}
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        scriptLib.unixUser.create(exports.unix_user, exports.working_directory_path);
        if (getEnv() === "DEV") {
            if (!fs.existsSync(exports.node_path)) {
                throw new Error("Missing local copy of node");
            }
            scriptLib.enableCmdTrace();
            yield fetch_asterisk_and_dongle(exports.working_directory_path);
        }
        yield (function configure_asterisk() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let package_name of [
                    "libuuid1",
                    "libjansson4",
                    "libxml2",
                    "libsqlite3-0",
                    "unixodbc",
                    "libsrtp0",
                    "libsqliteodbc"
                ]) {
                    yield scriptLib.apt_get_install(package_name);
                }
                fs.writeFileSync(exports.ast_main_conf_path, Buffer.from([
                    `[directories](!)`,
                    `astetcdir => ${ast_dir_link_path}/etc/asterisk`,
                    `astmoddir => ${ast_dir_link_path}/lib/asterisk/modules`,
                    `astvarlibdir => ${ast_dir_link_path}/var/lib/asterisk`,
                    `astdbdir => ${ast_dir_link_path}/var/lib/asterisk`,
                    `astkeydir => ${ast_dir_link_path}/var/lib/asterisk`,
                    `astdatadir => ${ast_dir_link_path}/var/lib/asterisk`,
                    `astagidir => ${ast_dir_link_path}/var/lib/asterisk/agi-bin`,
                    `astspooldir => ${ast_dir_link_path}/var/spool/asterisk`,
                    `astrundir => ${ast_dir_link_path}/var/run/asterisk`,
                    `astlogdir => ${ast_dir_link_path}/var/log/asterisk`,
                    `astsbindir => ${ast_dir_link_path}/sbin`,
                    ``,
                    `[options]`,
                    `documentation_language = en_US`,
                    ``,
                    `[modules]`,
                    `preload => res_odbc.so`,
                    `preload => res_config_odbc.so`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "rtp.conf"), Buffer.from([
                    `[general]`,
                    `icesupport=yes`,
                    `stunaddr=turn.${getBaseDomain()}:19302`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "res_odbc.conf"), Buffer.from([
                    `[${odbc.connection_name}]`,
                    `enabled => yes`,
                    `dsn => ${odbc.connection_name}`,
                    `pre-connect => yes`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "sorcery.conf"), Buffer.from([
                    `[res_pjsip]`,
                    `endpoint=realtime,ps_endpoints`,
                    `auth=realtime,ps_auths`,
                    `aor=realtime,ps_aors`,
                    `domain_alias=realtime,ps_domain_aliases`,
                    `contact=realtime,ps_contacts`,
                    ``,
                    `[res_pjsip_endpoint_identifier_ip]`,
                    `identify=realtime,ps_endpoint_id_ips`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "extconfig.conf"), Buffer.from([
                    `[settings]`,
                    `ps_endpoints => odbc,${odbc.connection_name}`,
                    `ps_auths => odbc,${odbc.connection_name}`,
                    `ps_aors => odbc,${odbc.connection_name}`,
                    `ps_domain_aliases => odbc,${odbc.connection_name}`,
                    `ps_endpoint_id_ips => odbc,${odbc.connection_name}`,
                    `ps_contacts => odbc,${odbc.connection_name}`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "pjsip.conf"), Buffer.from([
                    `[transport-tcp]`,
                    `type=transport`,
                    `protocol=tcp`,
                    `bind=0.0.0.0:${exports.ast_sip_port}`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "modules.conf"), Buffer.from([
                    `[modules]`,
                    `autoload=yes`,
                    ``
                ].join("\n"), "utf8"));
                scriptLib.execSync(`chmod 640 ${exports.ast_etc_dir_path}/*`);
                yield (function generate_dtls_certs() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield scriptLib.apt_get_install("openssl");
                        const { exec, onSuccess } = scriptLib.start_long_running_process("Generating TLS certificates");
                        yield exec(`mkdir ${keys_dir_path}`);
                        const host_cfg_path = path.join(keys_dir_path, "host.cfg");
                        fs.writeFileSync(host_cfg_path, Buffer.from([
                            `[req]`,
                            `distinguished_name = req_distinguished_name`,
                            `prompt = no`,
                            ``,
                            `[req_distinguished_name]`,
                            `CN=www.${getBaseDomain()}`,
                            `O=Semasim user gateway`,
                            ``
                        ].join("\n"), "utf8"));
                        const ca_cfg_path = path.join(keys_dir_path, "ca.cfg");
                        fs.writeFileSync(ca_cfg_path, Buffer.from([
                            `[req]`,
                            `distinguished_name = req_distinguished_name`,
                            `prompt = no`,
                            ``,
                            `[req_distinguished_name]`,
                            `CN=Asterisk Private CA`,
                            `O=Semasim user gateway`,
                            ``,
                            `[ext]`,
                            `basicConstraints=CA:TRUE`,
                            ``
                        ].join("\n"), "utf8"));
                        const passphrase = "unsafe_ok_for_the_use_case";
                        const ca_key_path = path.join(keys_dir_path, "ca.key");
                        yield exec([
                            `openssl genrsa`,
                            `-des3`,
                            `-passout pass:${passphrase}`,
                            `-out ${ca_key_path}`,
                            `4096`
                        ].join(" "));
                        const validity_days = 24853;
                        yield exec([
                            `openssl req`,
                            `-new`,
                            `-config ${ca_cfg_path}`,
                            `-x509`,
                            `-days ${validity_days}`,
                            `-key ${ca_key_path} -passin pass:${passphrase}`,
                            `-out ${exports.ca_crt_path}`
                        ].join(" "));
                        yield exec(`rm ${ca_cfg_path}`);
                        const host_key_path = path.join(keys_dir_path, "host.key");
                        yield exec(`openssl genrsa -out ${host_key_path} 1024`);
                        const host_csr_path = path.join(keys_dir_path, "host.csr");
                        yield exec([
                            `openssl req`,
                            `-batch`,
                            `-new`,
                            `-config ${host_cfg_path}`,
                            `-key ${host_key_path}`,
                            `-out ${host_csr_path}`
                        ].join(" "));
                        yield exec(`rm ${host_cfg_path}`);
                        const host_crt_path = path.join(keys_dir_path, "host.crt");
                        yield exec([
                            `openssl x509`,
                            `-req`,
                            `-days ${validity_days}`,
                            `-in ${host_csr_path}`,
                            `-CA ${exports.ca_crt_path}`,
                            `-CAkey ${ca_key_path} -passin pass:${passphrase}`,
                            `-set_serial 01`,
                            `-out ${host_crt_path}`
                        ].join(" "));
                        yield exec(`rm ${ca_key_path} ${host_csr_path}`);
                        yield exec(`cat ${host_key_path} > ${exports.host_pem_path}`);
                        yield exec(`cat ${host_crt_path} >> ${exports.host_pem_path}`);
                        yield exec(`rm ${host_key_path} ${host_crt_path}`);
                        yield exec(`chmod 600 ${exports.host_pem_path}`);
                        onSuccess();
                    });
                })();
                odbc.configure();
                scriptLib.createSymlink(exports.ast_dir_path, ast_dir_link_path);
                scriptLib.fs_move("COPY", path.join(exports.module_dir_path, "res"), exports.working_directory_path, exports.ast_db_path);
            });
        })();
        scriptLib.fs_move("COPY", path.join(exports.module_dir_path, "res"), exports.working_directory_path, exports.semasim_db_path);
        shellScripts.create();
        scriptLib.execSync(`chown -R ${exports.unix_user}:${exports.unix_user} ${exports.working_directory_path}`);
        dongle.install();
        scriptLib.systemd.createConfigFile(exports.srv_name, path.join(__dirname, "main.js"), exports.node_path, "ENABLE", "START");
    });
}
function uninstall(verbose = false) {
    const write = !!verbose ? process.stdout.write.bind(process.stdout) : (() => { });
    const log = (str) => write(`${str}\n`);
    const runRecover = (description, action) => {
        write(description);
        try {
            action();
            log(scriptLib.colorize("ok", "GREEN"));
        }
        catch ({ message }) {
            log(scriptLib.colorize(message, "RED"));
        }
    };
    runRecover("Terminating running instance ... ", () => scriptLib.stopProcessSync(exports.pidfile_path, "SIGUSR2"));
    runRecover("Removing systemd service ... ", () => scriptLib.systemd.deleteConfigFile(exports.srv_name));
    runRecover("Uninstalling chan_dongle_extended ...", () => dongle.uninstall());
    runRecover("Restoring odbc ... ", () => odbc.restore());
    runRecover("Removing uninstaller from path ...", () => shellScripts.remove_symbolic_links());
    runRecover("Deleting run link to internal asterisk ... ", () => scriptLib.execSyncQuiet(`rm -r ${ast_dir_link_path}`));
    runRecover("Deleting unix user ... ", () => scriptLib.unixUser.remove(exports.unix_user));
    if (getEnv() === "DEV") {
        runRecover("Deleting working directory ... ", () => scriptLib.execSyncQuiet(`rm -r ${exports.working_directory_path}`));
    }
}
/** Create dir if does not exist, keep the files in it if it does */
function fetch_asterisk_and_dongle(dest_dir_path) {
    return __awaiter(this, void 0, void 0, function* () {
        const arch = scriptLib.sh_eval("uname -m");
        yield scriptLib.download_and_extract_tarball(`https://github.com/garronej/asterisk/releases/download/latest/asterisk_${arch}.tar.gz`, dest_dir_path, "MERGE");
        yield scriptLib.download_and_extract_tarball(`https://github.com/garronej/dongle/releases/download/latest/dongle_${arch}.tar.gz`, path.join(dest_dir_path, path.basename(exports.dongle_dir_path)), "OVERWRITE IF EXIST");
    });
}
var dongle;
(function (dongle) {
    dongle.installer_cmd = `${exports.dongle_node_path} ${path.join(exports.dongle_bin_dir_path, "installer.js")}`;
    function install() {
        scriptLib.execSyncTrace([
            `${dongle.installer_cmd} install`,
            `--asterisk_main_conf ${exports.ast_main_conf_path}`,
            `--disable_sms_dialplan`,
            `--ast_include_dir_path ${path.join(exports.ast_dir_path, "include")}`,
            `--enable_ast_ami_on_port 48397`,
            `--unix_user ${exports.unix_user}`,
            `--do_not_create_systemd_conf`,
            getEnv() === "PROD" ? "--assume_chan_dongle_installed" : ""
        ].join(" "));
        (function merge_installed_pkg() {
            const dongle_installed_pkg_record = path.join(exports.dongle_dir_path, path.basename(installed_pkg_record_path));
            if (fs.existsSync(dongle_installed_pkg_record)) {
                const pkg_list = require(dongle_installed_pkg_record);
                for (let pkg_name of pkg_list) {
                    scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, pkg_name);
                }
            }
        })();
    }
    dongle.install = install;
    function uninstall() {
        scriptLib.execSyncQuiet(`${dongle.installer_cmd} uninstall`);
    }
    dongle.uninstall = uninstall;
})(dongle || (dongle = {}));
var shellScripts;
(function (shellScripts) {
    function create() {
        process.stdout.write(`Creating shell scripts ... `);
        scriptLib.createScript(path.join(exports.working_directory_path, "asterisk_cli.sh"), [
            `#!/usr/bin/env bash`,
            ``,
            `# This script connect to the CLI of Semasim's Asterisk instance.`,
            ``,
            `cd ${path.join(exports.ast_dir_path, "var", "lib", "asterisk")}`,
            `su -s $(which bash) -c "LD_LIBRARY_PATH=${exports.ld_library_path_for_asterisk} ${exports.ast_path} -rvvvvvv -C ${exports.ast_main_conf_path}" ${exports.unix_user}`,
            ``
        ].join("\n"));
        const uninstaller_sh_path = path.join(exports.working_directory_path, "uninstaller.sh");
        scriptLib.createScript(uninstaller_sh_path, [
            `#!/usr/bin/env bash`,
            ``,
            `# Will uninstall the service and remove source if installed from tarball`,
            ``,
            `if [ "$1" == "run" ]`,
            `then`,
            `   if [[ $EUID -ne 0 ]]; then`,
            `       echo "This script require root privileges."`,
            `       exit 1`,
            `   fi`,
            `   ${exports.node_path} ${__filename} uninstall`,
            `   ${getEnv() === "PROD" ? `rm -r ${exports.module_dir_path}` : ""}`,
            `else`,
            `   echo "If you wish to uninstall chan-dongle-extended call this script with 'run' as argument:"`,
            `   echo "$0 run"`,
            `fi`,
            ``
        ].join("\n"));
        scriptLib.createSymlink(uninstaller_sh_path, uninstaller_link_path);
        console.log(scriptLib.colorize("OK", "GREEN"));
    }
    shellScripts.create = create;
    function remove_symbolic_links() {
        scriptLib.execSyncQuiet(`rm -f ${uninstaller_link_path}`);
    }
    shellScripts.remove_symbolic_links = remove_symbolic_links;
})(shellScripts || (shellScripts = {}));
var odbc;
(function (odbc) {
    odbc.connection_name = "semasim_asterisk";
    const odbc_config_path = "/etc/odbc.ini";
    function configure() {
        const parsed_odbc_conf = ini_extended_1.ini.parseStripWhitespace(fs.readFileSync(odbc_config_path).toString("utf8"));
        parsed_odbc_conf[odbc.connection_name] = {
            "Description": 'SQLite3 connection to ‘asterisk’ database for semasim',
            "Driver": 'SQLite3',
            "Database": exports.ast_db_path,
            "Timeout": '2000'
        };
        fs.writeFileSync(odbc_config_path, Buffer.from(ini_extended_1.ini.stringify(parsed_odbc_conf), "utf8"));
    }
    odbc.configure = configure;
    function restore() {
        const parsed_odbc_conf = ini_extended_1.ini.parseStripWhitespace(fs.readFileSync(odbc_config_path).toString("utf8"));
        delete parsed_odbc_conf[odbc.connection_name];
        fs.writeFileSync(odbc_config_path, Buffer.from(ini_extended_1.ini.stringify(parsed_odbc_conf), "utf8"));
    }
    odbc.restore = restore;
})(odbc || (odbc = {}));
if (require.main === module) {
    process.once("unhandledRejection", error => { throw error; });
    scriptLib.exit_if_not_root();
    scriptLib.apt_get_install.onInstallSuccess = package_name => scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, package_name);
    Promise.resolve().then(() => require("commander")).then(program => {
        program
            .command("install")
            .action(() => program_action_install());
        program
            .command("uninstall")
            .action(() => program_action_uninstall());
        program
            .command("update")
            .option(`--path [{path}]`)
            .action(() => program_action_update());
        program
            .command("tarball")
            .action(() => program_action_tarball());
        program.parse(process.argv);
    });
}
