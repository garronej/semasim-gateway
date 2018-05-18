#!/usr/bin/env node
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
const program = require("commander");
const fs = require("fs");
const path = require("path");
const scriptLib = require("scripting-tools");
const c = require("../lib/_constants");
const ini_extended_1 = require("ini-extended");
const module_dir_path = path.join(__dirname, "..", "..");
const main_js_path = path.join(module_dir_path, "dist", "bin", "main.js");
exports.working_directory_path = path.join(module_dir_path, "working_directory");
const pre_compiled_dir_path = path.join(module_dir_path, "pre_compiled");
const node_path = path.join(module_dir_path, "node");
const pkg_list_path = path.join(module_dir_path, "pkg_installed.json");
exports.ast_dir_path = path.join(exports.working_directory_path, "asterisk");
exports.ast_lib_dir_path = path.join(exports.ast_dir_path, "lib");
exports.ast_path = path.join(exports.ast_dir_path, "sbin", "asterisk");
const dongle_dir_path = path.join(exports.working_directory_path, "dongle");
exports.ast_etc_dir_path = path.join(exports.ast_dir_path, "etc", "asterisk");
exports.ast_main_conf_path = path.join(exports.ast_etc_dir_path, "asterisk.conf");
exports.ast_db_path = path.join(exports.working_directory_path, "asterisk.db");
exports.app_db_path = path.join(exports.working_directory_path, "semasim.db");
const keys_dir_path = path.join(exports.ast_etc_dir_path, "keys");
exports.ca_crt_path = path.join(keys_dir_path, "ca.crt");
exports.host_pem_path = path.join(keys_dir_path, "host.pem");
exports.ast_sip_port = 48398;
exports.unix_user = "semasim";
const srv_name = "semasim";
scriptLib.apt_get_install.onInstallSuccess = package_name => scriptLib.apt_get_install.record_installed_package(pkg_list_path, package_name);
program.command("install")
    .action((options) => __awaiter(this, void 0, void 0, function* () {
    console.log("---Installing chan-dongle-extended---");
    if (fs.existsSync(exports.working_directory_path)) {
        process.stdout.write(scriptLib.colorize("Already installed, uninstalling previous install... ", "YELLOW"));
        yield uninstall();
        console.log("DONE");
    }
    else {
        unixUser.gracefullyKillProcess();
    }
    (() => {
        let previous_working_directory_path;
        try {
            previous_working_directory_path = scriptLib.execSync(`dirname $(readlink -e $(which dongle))`).replace("\n", "");
        }
        catch (_a) {
            return;
        }
        process.stdout.write(scriptLib.colorize("Previous install found, uninstalling... ", "YELLOW"));
        scriptLib.execSync(`${path.join(previous_working_directory_path, "uninstaller.sh")} run`);
        console.log("DONE");
    })();
    try {
        yield install();
    }
    catch ({ message }) {
        process.stdout.write(scriptLib.colorize(`An error occurred: '${message}', rollback ...`, "RED"));
        yield uninstall();
        console.log("DONE");
        process.exit(-1);
        return;
    }
    console.log("---DONE---");
    process.exit(0);
}));
program
    .command("uninstall")
    .action(() => __awaiter(this, void 0, void 0, function* () {
    console.log("---Uninstalling semasim---");
    uninstall("VERBOSE");
    console.log("---DONE---");
    if (fs.existsSync(pkg_list_path)) {
        let pkg_list = require(pkg_list_path);
        console.log([
            "NOTE: Some packages have been installed automatically, ",
            "you can remove them if you no longer need them.",
            "\n",
            `$ sudo apt-get purge ${pkg_list.join(" ")}`,
            "\n",
            `$ sudo apt-get --purge autoremove`
        ].join(""));
    }
    process.exit(0);
}));
program
    .command("tarball")
    .action(() => __awaiter(this, void 0, void 0, function* () {
    const v_name = [
        "semasim",
        //`v${require(path.join(module_dir_path, "package.json"))["version"]}`,
        scriptLib.execSync("uname -m").replace("\n", "")
    ].join("_");
    const dir_path = path.join("/tmp", v_name);
    scriptLib.execSyncTrace(`rm -rf ${dir_path}`);
    scriptLib.execSyncTrace(`cp -r ${module_dir_path} ${dir_path}`);
    scriptLib.execSyncTrace(`cp $(readlink -e ${process.argv[0]}) ${dir_path}`);
    for (let name of [".git", ".gitignore", "src", "tsconfig.json"]) {
        scriptLib.execSyncTrace(`rm -rf ${path.join(dir_path, name)}`);
    }
    for (let name of ["@types", "typescript", "nodemon"]) {
        scriptLib.execSyncTrace(`rm -r ${path.join(dir_path, "node_modules", name)}`);
    }
    scriptLib.execSyncTrace(`find ${path.join(dir_path, "node_modules")} -type f -name "*.ts" -exec rm -rf {} \\;`);
    (() => {
        const new_pre_compiled_dir_path = path.join(dir_path, path.basename(pre_compiled_dir_path));
        const old_working_directory = path.join(dir_path, path.basename(exports.working_directory_path));
        scriptLib.execSyncTrace(`mkdir ${new_pre_compiled_dir_path}`);
        for (let dir_name of ["asterisk", "speex", "speexdsp", path.basename(dongle_dir_path)]) {
            scriptLib.execSyncTrace(`mv ${path.join(old_working_directory, dir_name)} ${new_pre_compiled_dir_path}`);
        }
        scriptLib.execSyncTrace(`rm -rf ${old_working_directory}`);
    })();
    scriptLib.execSyncTrace(`tar -czf ${path.join(module_dir_path, `${v_name}.tar.gz`)} -C ${dir_path} .`);
    scriptLib.execSyncTrace(`rm -r ${dir_path}`);
    console.log("---DONE---");
}));
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        let assume_chan_dongle_installed;
        if (fs.existsSync(path.join(module_dir_path, ".working_directory"))) {
            assume_chan_dongle_installed = true;
            /*
            TODO: we assume there is:
            asterisk speex speexdsp dongle
            in the .working_directory dir
            */
            const { exec, onSuccess } = scriptLib.start_long_running_process("Restoring working_directory");
            yield exec(`mv ${pre_compiled_dir_path} ${exports.working_directory_path}`);
            onSuccess();
        }
        else {
            assume_chan_dongle_installed = false;
            scriptLib.enableTrace();
            scriptLib.execSyncTrace(`mkdir ${exports.working_directory_path}`);
            scriptLib.execSyncTrace(`cp $(readlink -e ${process.argv[0]}) ${node_path}`);
            (function fetch_asterisk() {
                const ast_tarball_path = "/tmp/asterisk.tar.gz";
                scriptLib.execSyncTrace(`rm -rf ${ast_tarball_path}`);
                //TODO if armV8 => armV7
                scriptLib.execSyncTrace(`wget https://github.com/garronej/asterisk/releases/download/latest/asterisk_$(uname -m).tar.gz -O ${ast_tarball_path}`);
                scriptLib.execSyncTrace(`tar -xzf ${ast_tarball_path} -C ${exports.working_directory_path}`);
                scriptLib.execSyncTrace(`rm -r ${ast_tarball_path}`);
            })();
            (function fetch_dongle() {
                const dongle_tarball_path = "/tmp/dongle.tar.gz";
                scriptLib.execSyncTrace(`rm -rf ${dongle_tarball_path}`);
                scriptLib.execSyncTrace(`wget https://github.com/garronej/dongle/releases/download/latest/dongle_$(uname -m).tar.gz -O ${dongle_dir_path}`);
                scriptLib.execSyncTrace(`tar -xzf ${dongle_tarball_path} -C ${dongle_dir_path}`);
                scriptLib.execSyncTrace(`rm -r ${dongle_tarball_path}`);
            })();
        }
        yield (function configure_asterisk() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let package_name of [
                    "uuid-dev",
                    "libjansson-dev",
                    "libxml2-dev",
                    "libsqlite3-dev",
                    "libsrtp0-dev",
                    "unixodbc",
                    "unixodbc-dev",
                    "libsqliteodbc"
                ]) {
                    yield scriptLib.apt_get_install(package_name);
                }
                fs.writeFileSync(exports.ast_main_conf_path, Buffer.from([
                    ``,
                    `[directories](!)`,
                    `astetcdir => ${exports.ast_dir_path}/etc/asterisk`,
                    `astmoddir => ${exports.ast_dir_path}/usr/lib/asterisk/modules`,
                    `astvarlibdir => ${exports.ast_dir_path}/var/lib/asterisk`,
                    `astdbdir => ${exports.ast_dir_path}/var/lib/asterisk`,
                    `astkeydir => ${exports.ast_dir_path}/var/lib/asterisk`,
                    `astdatadir => ${exports.ast_dir_path}/var/lib/asterisk`,
                    `astagidir => ${exports.ast_dir_path}/var/lib/asterisk/agi-bin`,
                    `astspooldir => ${exports.ast_dir_path}/var/spool/asterisk`,
                    `astrundir => ${exports.ast_dir_path}/var/run/asterisk`,
                    `astlogdir => ${exports.ast_dir_path}/var/log/asterisk`,
                    `astsbindir => ${exports.ast_dir_path}/usr/sbin`,
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
                    ``,
                    `[general]`,
                    `icesupport=yes`,
                    `stunaddr=stun.${c.domain}:19302`,
                    ``
                ].join("\n"), "utf8"));
                scriptLib.execSync(`cp ${path.join(exports.working_directory_path, "res", "asterisk_empty.db")} ${exports.ast_db_path}`);
                odbc.configure();
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "res_odbc.conf"), Buffer.from([
                    ``,
                    `[${odbc.connection_name}]`,
                    `enabled => yes`,
                    `dsn => ${odbc.connection_name}`,
                    `pre-connect => yes`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "sorcery.conf"), Buffer.from([
                    ``,
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
                    ``,
                    `[settings]`,
                    `ps_endpoints => odbc,${odbc.connection_name}`,
                    `ps_auths => odbc,${odbc.connection_name}`,
                    `ps_aors => odbc,${odbc.connection_name}`,
                    `ps_domain_aliases => odbc,${odbc.connection_name}`,
                    `ps_endpoint_id_ips => odbc,${odbc.connection_name}`,
                    `ps_contacts => odbc,${odbc.connection_name}`,
                    ``
                ].join("\n"), "utf8"));
                fs.writeFileSync(path.join(exports.ast_etc_dir_path, "extconfig.conf"), Buffer.from([
                    ``,
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
                    ``,
                    `[transport-tcp]`,
                    `type=transport`,
                    `protocol=tcp`,
                    `bind=0.0.0.0:${exports.ast_sip_port}`,
                    ``
                ].join("\n"), "utf8"));
                yield (function generate_dtls_certs() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield scriptLib.apt_get_install("openssl", "openssl");
                        const { exec, onSuccess } = scriptLib.start_long_running_process("Generating TLS certificates");
                        yield exec(`mkdir ${keys_dir_path}`);
                        const host_cfg_path = path.join(keys_dir_path, "host.cfg");
                        fs.writeFileSync(host_cfg_path, Buffer.from([
                            ``,
                            `[req]`,
                            `distinguished_name = req_distinguished_name`,
                            `prompt = no`,
                            ``,
                            `[req_distinguished_name]`,
                            `CN=www.semasim.com`,
                            `O=Semasim user gateway`,
                            ``
                        ].join("\n"), "utf8"));
                        const ca_cfg_path = path.join(keys_dir_path, "ca.cfg");
                        fs.writeFileSync(ca_cfg_path, Buffer.from([
                            ``,
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
            });
        })();
        scriptLib.execSync(`cp ${path.join(exports.working_directory_path, "res", "semasim_empty.db")} ${exports.app_db_path}`);
        shellScripts.create();
        unixUser.create();
        scriptLib.execSync(`chown -R ${exports.unix_user}:${exports.unix_user} ${exports.working_directory_path}`);
        dongle.install(assume_chan_dongle_installed);
        systemd.create();
    });
}
function uninstall(verbose) {
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
    runRecover("Uninstalling chan_dongle_extended ...", () => dongle.uninstall());
    runRecover("Restoring odbc ... ", () => odbc.restore());
    runRecover("Removing uninstaller from path ...", () => shellScripts.remove_symbolic_links());
    runRecover("Removing systemd service ... ", () => systemd.remove());
    runRecover("Deleting unix user ... ", () => unixUser.remove());
    runRecover("Deleting working_directory ... ", () => scriptLib.execSync(`rm -r ${exports.working_directory_path}`));
}
var dongle;
(function (dongle) {
    const installer_path = path.join(dongle_dir_path, "dist", "bin", "installer.js");
    function install(assume_chan_dongle_installed) {
        scriptLib.execSyncTrace([
            `${node_path} ${installer_path} install`,
            `--asterisk_main_conf ${exports.ast_main_conf_path}`,
            `--disable_sms_dialplan`,
            `--ast_include_dir_path ${exports.ast_lib_dir_path}`,
            `--enable_ast_ami_on_port 48397`,
            `--assume_asterisk_installed`,
            assume_chan_dongle_installed ? `--assume_chan_dongle_installed` : ``
        ].join(" "));
        (function merge_installed_pkg() {
            const dongle_pkg_list_path = path.join(dongle_dir_path, "pkg_installed.json");
            if (fs.existsSync(dongle_pkg_list_path)) {
                const pkg_list = require(dongle_pkg_list_path);
                for (let pkg_name of pkg_list) {
                    scriptLib.apt_get_install.record_installed_package(pkg_list_path, pkg_name);
                }
            }
        })();
    }
    dongle.install = install;
    function uninstall() {
        return __awaiter(this, void 0, void 0, function* () {
            scriptLib.execSync(`${node_path} ${installer_path} uninstall 2> /dev/null`);
        });
    }
    dongle.uninstall = uninstall;
})(dongle || (dongle = {}));
var shellScripts;
(function (shellScripts) {
    const uninstaller_link_path = `/usr/sbin/${srv_name}_uninstaller`;
    function create() {
        process.stdout.write(`Creating shell scripts ... `);
        const writeAndSetPerms = (script_path, script) => {
            fs.writeFileSync(script_path, Buffer.from(script, "utf8"));
            scriptLib.execSync(`chmod +x ${script_path}`);
        };
        writeAndSetPerms(path.join(exports.working_directory_path, "start.sh"), [
            `#!/usr/bin/env bash`,
            ``,
            `# In charge of launching the service in interactive mode (via $ nmp start)`,
            `# It will gracefully terminate any running instance before.`,
            ``,
            `pkill -u ${exports.unix_user} -SIGUSR2 || true`,
            `cd ${exports.working_directory_path}`,
            `su -s bash -c "DEBUG=_* ${node_path} ${path.join(module_dir_path, "node_modules", ".bin", "nodemon")} ${main_js_path}" ${exports.unix_user}`,
            ``
        ].join("\n"));
        writeAndSetPerms(path.join(exports.working_directory_path, "asterisk_cli.sh"), [
            `#!/usr/bin/env bash`,
            ``,
            `# This script connect to the CLI of Semasim's Asterisk instance.`,
            ``,
            `cd ${path.join(exports.ast_dir_path, "var", "lib", "asterisk")}`,
            `su -s bash -c "LD_LIBRARY_PATH=${exports.ast_lib_dir_path} ${exports.ast_path} -rvvvvvv" ${exports.unix_user}`,
            ``
        ].join("\n"));
        const uninstaller_sh_path = path.join(exports.working_directory_path, "uninstaller.sh");
        writeAndSetPerms(uninstaller_sh_path, [
            `#!/bin/bash`,
            ``,
            `# Will uninstall the service and remove source if installed from tarball`,
            ``,
            `if [ "$1" == "run" ]`,
            `then`,
            `   if [[ $EUID -ne 0 ]]; then`,
            `       echo "This script require root privileges."`,
            `       exit 1`,
            `   fi`,
            `   ${node_path} ${__filename} uninstall`,
            `   ${fs.existsSync(path.join(module_dir_path, ".git")) ? `` : `rm -r ${module_dir_path}`}`,
            `else`,
            `   echo "If you wish to uninstall chan-dongle-extended call this script with 'run' as argument:"`,
            `   echo "$0 run"`,
            `fi`,
            ``
        ].join("\n"));
        scriptLib.execSync(`ln -sf ${uninstaller_sh_path} ${uninstaller_link_path}`);
        console.log(scriptLib.colorize("OK", "GREEN"));
    }
    shellScripts.create = create;
    function remove_symbolic_links() {
        scriptLib.execSync(`rm -f ${uninstaller_link_path} 2> /dev/null`);
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
var unixUser;
(function (unixUser) {
    unixUser.gracefullyKillProcess = () => scriptLib.execSync(`pkill -u ${exports.unix_user} -SIGUSR2 2> /dev/null || true`);
    function create() {
        process.stdout.write(`Creating unix user '${exports.unix_user}' ... `);
        unixUser.gracefullyKillProcess();
        scriptLib.execSync(`userdel ${exports.unix_user} 2> /dev/null || true`);
        scriptLib.execSync(`useradd -M ${exports.unix_user} -s /bin/false -d ${exports.working_directory_path}`);
        console.log(scriptLib.colorize("OK", "GREEN"));
    }
    unixUser.create = create;
    function remove() {
        scriptLib.execSync(`userdel ${exports.unix_user} 2> /dev/null`);
    }
    unixUser.remove = remove;
})(unixUser || (unixUser = {}));
var systemd;
(function (systemd) {
    const service_file_path = path.join("/etc/systemd/system", `${srv_name}.service`);
    function create() {
        process.stdout.write(`Creating systemd service ${service_file_path} ... `);
        let service = [
            `[Unit]`,
            `Description=semasim gateway daemon.`,
            `After=network.target`,
            ``,
            `[Service]`,
            `ExecStart=${node_path} ${main_js_path}`,
            `Environment=NODE_ENV=production`,
            `StandardOutput=journal`,
            `WorkingDirectory=${exports.working_directory_path}`,
            `Restart=always`,
            `RestartPreventExitStatus=0`,
            `RestartSec=10`,
            `User=${exports.unix_user}`,
            `Group=${exports.unix_user}`,
            ``,
            `[Install]`,
            `WantedBy=multi-user.target`,
            ``
        ].join("\n");
        fs.writeFileSync(service_file_path, Buffer.from(service, "utf8"));
        scriptLib.execSync("systemctl daemon-reload");
        scriptLib.execSync(`systemctl enable ${srv_name} --quiet`);
        //scriptLib.execSync(`systemctl start ${srv_name}`);
        console.log(scriptLib.colorize("OK", "GREEN"));
    }
    systemd.create = create;
    function remove() {
        try {
            scriptLib.execSync(`systemctl disable ${srv_name} --quiet`);
            fs.unlinkSync(service_file_path);
        }
        catch (_a) { }
        scriptLib.execSync("systemctl daemon-reload 2> /dev/null");
    }
    systemd.remove = remove;
})(systemd || (systemd = {}));
if (require.main === module) {
    require("rejection-tracker").main(exports.working_directory_path);
    scriptLib.exit_if_not_root();
    program.parse(process.argv);
}
