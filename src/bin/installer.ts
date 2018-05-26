#!/usr/bin/env node

import * as program from "commander";
import * as fs from "fs";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import * as c from "../lib/_constants";
import { ini } from "ini-extended";

const module_dir_path = path.join(__dirname, "..", "..");
const main_js_path = path.join(module_dir_path, "dist", "bin", "main.js");
export const working_directory_path = path.join(module_dir_path, "working_directory");
const pre_compiled_dir_path = path.join(module_dir_path, "pre_compiled");
const node_path = path.join(module_dir_path, "node");
const pkg_list_path = path.join(module_dir_path, "pkg_installed.json");
export const ast_dir_path = path.join(working_directory_path, "asterisk");
export const ast_path = path.join(ast_dir_path, "sbin", "asterisk");
const dongle_dir_path = path.join(working_directory_path, "dongle");
export const ast_etc_dir_path = path.join(ast_dir_path, "etc", "asterisk");
export const ast_main_conf_path = path.join(ast_etc_dir_path, "asterisk.conf");
export const ast_db_path = path.join(working_directory_path, "asterisk.db");
export const app_db_path = path.join(working_directory_path, "semasim.db");
const keys_dir_path = path.join(ast_etc_dir_path, "keys");
export const ca_crt_path = path.join(keys_dir_path, "ca.crt");
export const host_pem_path = path.join(keys_dir_path, "host.pem");
const ast_dir_link_path = "/usr/share/asterisk_semasim";

export const ld_library_path_for_asterisk = [
    path.join(ast_dir_path, "lib"),
    path.join(working_directory_path, "speexdsp", "lib"),
    path.join(working_directory_path, "speex", "lib")
].join(":");

export const ast_sip_port = 48398;

export const unix_user = "semasim";
const srv_name = "semasim";

scriptLib.apt_get_install.onInstallSuccess = package_name =>
    scriptLib.apt_get_install.record_installed_package(pkg_list_path, package_name);

program.command("install")
    .action(async options => {

        console.log("---Installing semasim---");

        if (fs.existsSync(working_directory_path)) {

            process.stdout.write(scriptLib.colorize("Already installed, uninstalling previous install... ", "YELLOW"));

            await uninstall();

            console.log("DONE");

        } else {

            stopRunningInstance();

        }

        (() => {

            let previous_working_directory_path: string;

            try {

                previous_working_directory_path = scriptLib.execSyncQuiet(
                    "dirname $(readlink -e $(which semasim_uninstaller))"
                ).slice(0,-1);

            } catch{

                return;

            }

            process.stdout.write(scriptLib.colorize("Previous install found, uninstalling... ", "YELLOW"));

            scriptLib.execSync(`${path.join(previous_working_directory_path, "uninstaller.sh")} run`);

            console.log("DONE");

        })();

        try {

            await install();

        } catch ({ message }) {

            process.stdout.write(scriptLib.colorize(`An error occurred: '${message}', rollback ...`, "RED"));

            await uninstall();

            console.log("DONE");

            process.exit(-1);

            return;

        }

        console.log("---DONE---");

        process.exit(0);

    });

program
    .command("uninstall")
    .action(async () => {

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

    });

program
    .command("tarball")
    .action(async () => {

        const v_name = [
            "semasim",
            //`v${require(path.join(module_dir_path, "package.json"))["version"]}`,
            scriptLib.execSync("uname -m").replace("\n", "")
        ].join("_");

        const _module_dir_path = path.join("/tmp", v_name);

        scriptLib.execSyncTrace(`rm -rf ${_module_dir_path}`);

        scriptLib.execSyncTrace(`cp -r ${module_dir_path} ${_module_dir_path}`);

        scriptLib.execSyncTrace(`rm -rf ${path.join(_module_dir_path, path.basename(working_directory_path))}`);

        scriptLib.execSyncTrace(`cp $(readlink -e ${process.argv[0]}) ${_module_dir_path}`);

        for (let name of [".git", ".gitignore", "src", "tsconfig.json"]) {
            scriptLib.execSyncTrace(`rm -r ${path.join(_module_dir_path, name)}`);
        }

        for (let name of ["@types", "typescript", "nodemon"]) {
            scriptLib.execSyncTrace(`rm -r ${path.join(_module_dir_path, "node_modules", name)}`);
        }

        scriptLib.execSyncTrace(`find ${path.join(_module_dir_path, "node_modules")} -type f -name "*.ts" -exec rm -rf {} \\;`);

        (() => {

            const _pre_compiled_dir_path = path.join(_module_dir_path, path.basename(pre_compiled_dir_path));

            scriptLib.execSyncTrace(`mkdir ${_pre_compiled_dir_path}`);

            fetch_asterisk_and_dongle(_pre_compiled_dir_path);

            const get_chan_dongle_module_path= (target: "SRC" | "DEST")=> path.join(
                target==="SRC"?working_directory_path:_pre_compiled_dir_path, 
                "asterisk", "lib", "asterisk", "modules", "chan_dongle.so"
            );

            scriptLib.execSyncTrace(`cp ${get_chan_dongle_module_path("SRC")} ${get_chan_dongle_module_path("DEST")}`);

        })();

        scriptLib.execSyncTrace(`tar -czf ${path.join(module_dir_path, `${v_name}.tar.gz`)} -C ${_module_dir_path} .`);

        scriptLib.execSyncTrace(`rm -r ${_module_dir_path}`);

        console.log("---DONE---");

    });

async function install() {

    unixUser.create();

    let assume_chan_dongle_installed: boolean;

    if (fs.existsSync(pre_compiled_dir_path)) {

        assume_chan_dongle_installed = true;

        const { exec, onSuccess } = scriptLib.start_long_running_process("Restoring working_directory");

        await exec(`mv ${pre_compiled_dir_path} ${working_directory_path}`);

        onSuccess();

    } else {

        assume_chan_dongle_installed = false;

        scriptLib.enableTrace();

        scriptLib.execSyncTrace(`mkdir ${working_directory_path}`);

        scriptLib.execSyncTrace(`cp $(readlink -e ${process.argv[0]}) ${node_path}`);

        fetch_asterisk_and_dongle(working_directory_path);

    }

    await (async function configure_asterisk() {

        /*
        TODO: in debian stretch and above there is no libssl1.0.1 package
        so we should install libssl1.0.2 and try to create symbolic link

        libssl.so.1.0.0 -> libssl.so.1.0.2

        pi @ raspberrypi-1b ~ $ dpkg -L libssl1.0.2
        /.
        /usr
        /usr/lib
        /usr/lib/arm-linux-gnueabihf
        /usr/lib/arm-linux-gnueabihf/libcrypto.so.1.0.2
        /usr/lib/arm-linux-gnueabihf/libssl.so.1.0.2
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/lib4758cca.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libaep.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libatalla.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libcapi.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libchil.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libcswift.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libgmp.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libgost.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libnuron.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libpadlock.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libsureware.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.2/engines/libubsec.so
        /usr/share
        /usr/share/doc
        /usr/share/doc/libssl1.0.2
        /usr/share/doc/libssl1.0.2/changelog.Debian.gz
        /usr/share/doc/libssl1.0.2/changelog.gz
        /usr/share/doc/libssl1.0.2/copyright
        /usr/share/lintian
        /usr/share/lintian/overrides
        /usr/share/lintian/overrides/libssl1.0.2
         ✓ pi @ raspberrypi-1b ~ $ cd /usr/lib/arm-linux-gnueabihf/
         ✓ pi @ raspberrypi-1b /usr/lib/arm-linux-gnueabihf $ ll | grep libssl
        -rw-r--r--  1 root root  264K Oct  7  2017 libssl3.so
        -rw-r--r--  1 root root  321K Mar 29 10:51 libssl.so.1.1
        lrwxrwxrwx  1 root root    13 Mar 29 10:51 libssl.so -> libssl.so.1.1
        -rw-r--r--  1 root root  480K Mar 29 10:51 libssl.a
        -rw-r--r--  1 root root  314K Mar 29 11:10 libssl.so.1.0.2

        pi @ raspberrypi-3 /usr/lib/arm-linux-gnueabihf $ dpkg -L libssl1.0.0
        /.
        /usr
        /usr/share
        /usr/share/doc
        /usr/share/doc/libssl1.0.0
        /usr/share/doc/libssl1.0.0/changelog.gz
        /usr/share/doc/libssl1.0.0/copyright
        /usr/share/doc/libssl1.0.0/changelog.Debian.gz
        /usr/lib
        /usr/lib/arm-linux-gnueabihf
        /usr/lib/arm-linux-gnueabihf/libcrypto.so.1.0.0
        /usr/lib/arm-linux-gnueabihf/libssl.so.1.0.0
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libgmp.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libnuron.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libatalla.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libubsec.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libpadlock.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libcswift.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libaep.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libgost.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libchil.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/lib4758cca.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libsureware.so
        /usr/lib/arm-linux-gnueabihf/openssl-1.0.0/engines/libcapi.so
         ✓ pi @ raspberrypi-3 /usr/lib/arm-linux-gnueabihf $ ll | grep libssl
        -rw-r--r-- 1 root root  264K Oct 11  2017 libssl3.so
        lrwxrwxrwx 1 root root    15 Mar 29 22:33 libssl.so -> libssl.so.1.0.0
        -rw-r--r-- 1 root root  294K Mar 29 22:33 libssl.so.1.0.0
        -rw-r--r-- 1 root root  430K Mar 29 22:33 libssl.a
        */

        for (let package_name of [
            "libssl1.0.0",
            "libuuid1",
            "libjansson4",
            "libxml2",
            "libsqlite3-0",
            "unixodbc",
            "libsrtp0",
            "libsqliteodbc"
        ]) {

            await scriptLib.apt_get_install(package_name);

        }

        fs.writeFileSync(
            ast_main_conf_path,
            Buffer.from(
                [
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
                ].join("\n"),
                "utf8"
            )
        );

        scriptLib.execSync(`ln -s ${ast_dir_path} ${ast_dir_link_path}`);

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "rtp.conf"),
            Buffer.from(
                [
                    `[general]`,
                    `icesupport=yes`,
                    `stunaddr=stun.${c.domain}:19302`,
                    ``
                ].join("\n"), "utf8"
            )
        );

        scriptLib.execSync(`cp ${path.join(module_dir_path, "res", "asterisk_empty.db")} ${ast_db_path}`);

        odbc.configure();

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "res_odbc.conf"),
            Buffer.from(
                [
                    `[${odbc.connection_name}]`,
                    `enabled => yes`,
                    `dsn => ${odbc.connection_name}`,
                    `pre-connect => yes`,
                    ``
                ].join("\n"), "utf8"
            )
        );

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "sorcery.conf"),
            Buffer.from(
                [
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
                ].join("\n"), "utf8"
            )
        );

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "extconfig.conf"),
            Buffer.from(
                [
                    `[settings]`,
                    `ps_endpoints => odbc,${odbc.connection_name}`,
                    `ps_auths => odbc,${odbc.connection_name}`,
                    `ps_aors => odbc,${odbc.connection_name}`,
                    `ps_domain_aliases => odbc,${odbc.connection_name}`,
                    `ps_endpoint_id_ips => odbc,${odbc.connection_name}`,
                    `ps_contacts => odbc,${odbc.connection_name}`,
                    ``
                ].join("\n"), "utf8"
            )
        );

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "pjsip.conf"),
            Buffer.from(
                [
                    `[transport-tcp]`,
                    `type=transport`,
                    `protocol=tcp`,
                    `bind=0.0.0.0:${ast_sip_port}`,
                    ``
                ].join("\n"), "utf8"
            )
        );

        fs.writeFileSync(
            path.join(ast_etc_dir_path, "modules.conf"),
            Buffer.from(
                [
                    `[modules]`,
                    `autoload=yes`,
                    ``
                ].join("\n"), "utf8"
            )
        );

        scriptLib.execSync(`chmod 640 ${ast_etc_dir_path}/*`);

        await (async function generate_dtls_certs() {

            await scriptLib.apt_get_install("openssl");

            const { exec, onSuccess } = scriptLib.start_long_running_process("Generating TLS certificates");

            await exec(`mkdir ${keys_dir_path}`);

            const host_cfg_path = path.join(keys_dir_path, "host.cfg");

            fs.writeFileSync(
                host_cfg_path,
                Buffer.from(
                    [
                        `[req]`,
                        `distinguished_name = req_distinguished_name`,
                        `prompt = no`,
                        ``,
                        `[req_distinguished_name]`,
                        `CN=www.semasim.com`,
                        `O=Semasim user gateway`,
                        ``
                    ].join("\n"), "utf8"
                )
            );

            const ca_cfg_path = path.join(keys_dir_path, "ca.cfg");

            fs.writeFileSync(
                ca_cfg_path,
                Buffer.from(
                    [
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
                    ].join("\n"), "utf8"
                )
            );

            const passphrase = "unsafe_ok_for_the_use_case";

            const ca_key_path = path.join(keys_dir_path, "ca.key");

            await exec([
                `openssl genrsa`,
                `-des3`,
                `-passout pass:${passphrase}`,
                `-out ${ca_key_path}`,
                `4096`
            ].join(" "));

            const validity_days = 24853;

            await exec([
                `openssl req`,
                `-new`,
                `-config ${ca_cfg_path}`,
                `-x509`,
                `-days ${validity_days}`,
                `-key ${ca_key_path} -passin pass:${passphrase}`,
                `-out ${ca_crt_path}`
            ].join(" "));

            await exec(`rm ${ca_cfg_path}`);

            const host_key_path = path.join(keys_dir_path, "host.key");

            await exec(`openssl genrsa -out ${host_key_path} 1024`);

            const host_csr_path = path.join(keys_dir_path, "host.csr");

            await exec([
                `openssl req`,
                `-batch`,
                `-new`,
                `-config ${host_cfg_path}`,
                `-key ${host_key_path}`,
                `-out ${host_csr_path}`
            ].join(" "));

            await exec(`rm ${host_cfg_path}`);

            const host_crt_path = path.join(keys_dir_path, "host.crt");

            await exec([
                `openssl x509`,
                `-req`,
                `-days ${validity_days}`,
                `-in ${host_csr_path}`,
                `-CA ${ca_crt_path}`,
                `-CAkey ${ca_key_path} -passin pass:${passphrase}`,
                `-set_serial 01`,
                `-out ${host_crt_path}`
            ].join(" "));

            await exec(`rm ${ca_key_path} ${host_csr_path}`);

            await exec(`cat ${host_key_path} > ${host_pem_path}`);
            await exec(`cat ${host_crt_path} >> ${host_pem_path}`);

            await exec(`rm ${host_key_path} ${host_crt_path}`)

            await exec(`chmod 600 ${host_pem_path}`);

            onSuccess();

        })();

    })();

    scriptLib.execSync(`cp ${path.join(module_dir_path, "res", "semasim_empty.db")} ${app_db_path}`);

    shellScripts.create();

    scriptLib.execSync(`chown -R ${unix_user}:${unix_user} ${working_directory_path}`);

    dongle.install(assume_chan_dongle_installed);

    systemd.create();

}

function uninstall(verbose?: "VERBOSE" | undefined) {

    const write: (str: string) => void = !!verbose ? process.stdout.write.bind(process.stdout) : (() => { });
    const log = (str: string) => write(`${str}\n`);

    const runRecover = (description: string, action: () => void) => {

        write(description);

        try {

            action();

            log(scriptLib.colorize("ok", "GREEN"));

        } catch ({ message }) {

            log(scriptLib.colorize(message, "RED"));

        }

    }

    runRecover("Terminating running instance ... ", () => stopRunningInstance());

    runRecover("Removing systemd service ... ", () => systemd.remove());

    runRecover("Uninstalling chan_dongle_extended ...", () => dongle.uninstall());

    runRecover("Restoring odbc ... ", () => odbc.restore());

    runRecover("Removing uninstaller from path ...", () => shellScripts.remove_symbolic_links());

    runRecover("Deleting working_directory ... ", () => scriptLib.execSync(`rm -r ${working_directory_path}`));

    runRecover("Deleting run link to internal asterisk ... ", () => scriptLib.execSync(`rm -r ${ast_dir_link_path}`));

    runRecover("Deleting unix user ... ", () => unixUser.remove());

}

function stopRunningInstance(){
    try{ scriptLib.execSyncQuiet(stopRunningInstance.cmd); }catch{}
}

namespace stopRunningInstance {
    export const cmd= `pkill -u ${unix_user} -SIGUSR2`;
}

function fetch_asterisk_and_dongle(dest_dir_path: string) {

    (function fetch_asterisk() {

        const ast_tarball_path = "/tmp/asterisk.tar.gz";

        scriptLib.execSyncTrace(`rm -rf ${ast_tarball_path}`);

        scriptLib.execSyncTrace(`wget https://github.com/garronej/asterisk/releases/download/latest/asterisk_$(uname -m).tar.gz -O ${ast_tarball_path}`);

        scriptLib.execSyncTrace(`tar -xzf ${ast_tarball_path} -C ${dest_dir_path}`);

        scriptLib.execSyncTrace(`rm -r ${ast_tarball_path}`);

    })();

    (function fetch_dongle() {

        const _dongle_dir_path = path.join(dest_dir_path, path.basename(dongle_dir_path));

        const dongle_tarball_path = "/tmp/dongle.tar.gz";

        scriptLib.execSyncTrace(`rm -rf ${dongle_tarball_path}`);

        scriptLib.execSyncTrace(`wget https://github.com/garronej/dongle/releases/download/latest/dongle_$(uname -m).tar.gz -O ${dongle_tarball_path}`)

        scriptLib.execSyncTrace(`mkdir ${_dongle_dir_path}`);

        scriptLib.execSyncTrace(`tar -xzf ${dongle_tarball_path} -C ${_dongle_dir_path}`);

        scriptLib.execSyncTrace(`rm -r ${dongle_tarball_path}`);

    })();

}

namespace dongle {

    const installer_cmd = `${path.join(dongle_dir_path, "node")} ${path.join(dongle_dir_path, "dist", "bin", "installer.js")}`;

    export function install(assume_chan_dongle_installed: boolean) {

        scriptLib.execSync([
            `${installer_cmd} install`,
            `--asterisk_main_conf ${ast_main_conf_path}`,
            `--disable_sms_dialplan`,
            `--ast_include_dir_path ${path.join(ast_dir_path, "include")}`,
            `--enable_ast_ami_on_port 48397`,
            assume_chan_dongle_installed ? `--assume_chan_dongle_installed` : ``,
            `--ld_library_path_for_asterisk ${ld_library_path_for_asterisk}`
        ].join(" "), { "stdio": "inherit" });

        (function merge_installed_pkg() {

            const dongle_pkg_list_path = path.join(dongle_dir_path, "pkg_installed.json");

            if (fs.existsSync(dongle_pkg_list_path)) {

                const pkg_list: string[] = require(dongle_pkg_list_path);

                for (let pkg_name of pkg_list) {

                    scriptLib.apt_get_install.record_installed_package(pkg_list_path, pkg_name);

                }

            }

        })();

    }

    export async function uninstall() {

        scriptLib.execSyncQuiet(`${installer_cmd} uninstall`);

    }

}

namespace shellScripts {

    const uninstaller_link_path = `/usr/sbin/${srv_name}_uninstaller`;

    export function create(): void {

        process.stdout.write(`Creating shell scripts ... `);

        const writeAndSetPerms = (script_path: string, script: string): void => {

            fs.writeFileSync(script_path, Buffer.from(script, "utf8"));

            scriptLib.execSync(`chmod +x ${script_path}`);

        };

        let node_exec_cmd = (() => {

            const nodemon_path = path.join(module_dir_path, "node_modules", ".bin", "nodemon");

            return fs.existsSync(nodemon_path) ? `${node_path} ${nodemon_path}` : node_path;

        })();

        writeAndSetPerms(
            path.join(working_directory_path, "start.sh"),
            [
                `#!/usr/bin/env bash`,
                ``,
                `# In charge of launching the service in interactive mode (via $ nmp start)`,
                `# It will gracefully terminate any running instance before.`,
                ``,
                `${stopRunningInstance.cmd} 2>/dev/null`,
                `su -s $(which bash) -c "(cd ${working_directory_path} && DEBUG=_* ${node_exec_cmd} ${main_js_path})" ${unix_user}`,
                ``
            ].join("\n")
        );

        writeAndSetPerms(
            path.join(working_directory_path, "asterisk_cli.sh"),
            [
                `#!/usr/bin/env bash`,
                ``,
                `# This script connect to the CLI of Semasim's Asterisk instance.`,
                ``,
                `cd ${path.join(ast_dir_path, "var", "lib", "asterisk")}`,
                `su -s $(which bash) -c "LD_LIBRARY_PATH=${ld_library_path_for_asterisk} ${ast_path} -rvvvvvv -C ${ast_main_conf_path}" ${unix_user}`,
                ``
            ].join("\n")
        );

        writeAndSetPerms(
            path.join(working_directory_path, "asterisk_start.sh"),
            [
                `#!/usr/bin/env bash`,
                ``,
                `cd ${path.join(ast_dir_path, "var", "lib", "asterisk")}`,
                `su -s $(which bash) -c "LD_LIBRARY_PATH=${ld_library_path_for_asterisk} ${ast_path} -fvvvvvvc -C ${ast_main_conf_path}" ${unix_user}`,
                ``
            ].join("\n")
        );

        const uninstaller_sh_path = path.join(working_directory_path, "uninstaller.sh");

        writeAndSetPerms(
            uninstaller_sh_path,
            [
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
            ].join("\n")
        );

        scriptLib.execSync(`ln -sf ${uninstaller_sh_path} ${uninstaller_link_path}`);

        console.log(scriptLib.colorize("OK", "GREEN"));

    }

    export function remove_symbolic_links() {

        scriptLib.execSyncQuiet(`rm -f ${uninstaller_link_path}`);

    }

}

namespace odbc {

    export const connection_name = "semasim_asterisk";

    const odbc_config_path = "/etc/odbc.ini";

    export function configure() {

        const parsed_odbc_conf = ini.parseStripWhitespace(
            fs.readFileSync(odbc_config_path).toString("utf8")
        );

        parsed_odbc_conf[connection_name] = {
            "Description": 'SQLite3 connection to ‘asterisk’ database for semasim',
            "Driver": 'SQLite3',
            "Database": ast_db_path,
            "Timeout": '2000'
        };

        fs.writeFileSync(
            odbc_config_path,
            Buffer.from(ini.stringify(parsed_odbc_conf), "utf8")
        );

    }

    export function restore() {

        const parsed_odbc_conf = ini.parseStripWhitespace(
            fs.readFileSync(odbc_config_path).toString("utf8")
        );

        delete parsed_odbc_conf[connection_name];

        fs.writeFileSync(
            odbc_config_path,
            Buffer.from(ini.stringify(parsed_odbc_conf), "utf8")
        );

    }

}

namespace unixUser {

    export function create() {

        process.stdout.write(`Creating unix user '${unix_user}' ... `);

        stopRunningInstance();

        scriptLib.execSyncQuiet(`userdel ${unix_user} || true`);

        scriptLib.execSync(`useradd -M ${unix_user} -s /bin/false -d ${working_directory_path}`);

        console.log(scriptLib.colorize("OK", "GREEN"));

    }

    export function remove() {

        scriptLib.execSyncQuiet(`userdel ${unix_user}`);

    }

}

namespace systemd {

    const service_file_path = path.join("/etc/systemd/system", `${srv_name}.service`);

    export function create(): void {

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
            `WorkingDirectory=${working_directory_path}`,
            `Restart=always`,
            `RestartPreventExitStatus=0`,
            `RestartSec=10`,
            `User=${unix_user}`,
            `Group=${unix_user}`,
            ``,
            `[Install]`,
            `WantedBy=multi-user.target`,
            ``
        ].join("\n");

        fs.writeFileSync(service_file_path, Buffer.from(service, "utf8"));

        scriptLib.execSync("systemctl daemon-reload");

        scriptLib.execSync(`systemctl enable ${srv_name} --quiet`);

        scriptLib.execSync(`systemctl start ${srv_name}`);

        console.log(scriptLib.colorize("OK", "GREEN"));

    }

    export function remove() {

        try {

            scriptLib.execSyncQuiet(`systemctl disable ${srv_name}`);

            fs.unlinkSync(service_file_path);

        } catch{ }

        scriptLib.execSyncQuiet("systemctl daemon-reload");

    }

}

if (require.main === module) {
    require("rejection-tracker").main(working_directory_path);
    scriptLib.exit_if_not_root();
    program.parse(process.argv);
}
