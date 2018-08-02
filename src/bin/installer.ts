import * as fs from "fs";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import { ini } from "ini-extended";

export const module_dir_path = path.join(__dirname, "..", "..");

export const unix_user = "semasim";
export const srv_name = "semasim";

export const working_directory_path = path.join(module_dir_path, "working_directory");
export const node_path = path.join(module_dir_path, "node");
const installed_pkg_record_path = path.join(module_dir_path, "pkg_installed.json");
export const ast_dir_path = path.join(working_directory_path, "asterisk");
export const ast_path = path.join(ast_dir_path, "sbin", "asterisk");
export const dongle_dir_path = path.join(working_directory_path, "dongle");
export const dongle_node_path = path.join(dongle_dir_path, "node");
export const dongle_bin_dir_path = path.join(dongle_dir_path, "dist", "bin");
export const ast_etc_dir_path = path.join(ast_dir_path, "etc", "asterisk");
export const ast_main_conf_path = path.join(ast_etc_dir_path, "asterisk.conf");
export const ast_db_path = path.join(working_directory_path, "asterisk.db");
export const semasim_db_path = path.join(working_directory_path, "semasim.db");
const keys_dir_path = path.join(ast_etc_dir_path, "keys");
export const ca_crt_path = path.join(keys_dir_path, "ca.crt");
export const host_pem_path = path.join(keys_dir_path, "host.pem");
const ast_dir_link_path = "/usr/share/asterisk_semasim";
const uninstaller_link_path = `/usr/sbin/${srv_name}_uninstaller`;
export const pidfile_path = path.join(working_directory_path, "pid");
const to_distribute_rel_paths = [
    "LICENSE",
    "README.md",
    `res/${path.basename(ast_db_path)}`,
    `res/${path.basename(semasim_db_path)}`,
    "dist",
    "node_modules",
    "package.json",
    path.basename(node_path)
];

export const ast_sip_port = 48398;

export const ld_library_path_for_asterisk = [
    path.join(ast_dir_path, "lib"),
    path.join(working_directory_path, "speexdsp", "lib"),
    path.join(working_directory_path, "speex", "lib")
].join(":");

export function getIsProd(): boolean {

    if (getIsProd.value !== undefined) {
        return getIsProd.value;
    }

    getIsProd.value = !fs.existsSync(path.join(module_dir_path, ".git"));

    return getIsProd();

}

export namespace getIsProd {

    export let value: boolean | undefined = undefined;

}

async function program_action_install() {

    console.log(`---Installing ${srv_name}---`);

    if (
        fs.existsSync(uninstaller_link_path) &&
        path.dirname(scriptLib.sh_eval(`readlink -f ${uninstaller_link_path}`)) !== working_directory_path
    ) {

        process.stdout.write(scriptLib.colorize("Uninstalling previous instal found in other location... ", "YELLOW"));

        scriptLib.execSync(`${uninstaller_link_path} run`);

        console.log(scriptLib.colorize("DONE", "GREEN"));

    }

    uninstall();

    try {

        await install();

    } catch ({ message }) {

        console.log(scriptLib.colorize(`An error occurred: '${message}`, "RED"));

        uninstall();

        if (getIsProd()) {

            scriptLib.execSync(`rm -r ${module_dir_path}`);

        }

        process.exit(-1);

        return;

    }

    const { onSuccess }=  scriptLib.start_long_running_process("Starting Semasim");

    while (true) {

        try{

            await scriptLib.exec("dongle list")

        }catch{

            continue;

        }

        break;

    }

    onSuccess("Started!");

    console.log(scriptLib.colorize("Semasim is now running, you can go to semasim.com to register your SIM cards.", "GREEN"));

    process.exit(0);

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

export async function program_action_update(): Promise<"LAUNCH" | "EXIT"> {

    scriptLib.enableCmdTrace();

    const { getVersionStatus } = await import("../lib/versionStatus");

    const versionStatus = await getVersionStatus();


    if (!getIsProd()) {

        console.log({ versionStatus });

        return "LAUNCH";

    }

    if (versionStatus === "UP TO DATE") {

        console.log("Semasim is UP TO DATE");

    } else if (versionStatus === "MINOR" || versionStatus === "PATCH") {

        console.log(`Performing ${versionStatus} update...`);

        const _module_dir_path = path.join(working_directory_path, path.basename(module_dir_path));

        await scriptLib.download_and_extract_tarball(
            `semasim.com/semasim_${scriptLib.sh_eval("uname -m")}.tar.gz`,
            _module_dir_path,
            "OVERWRITE IF EXIST"
        );

        for (const db_path of [semasim_db_path, ast_db_path]) {

            const [db_schema_path, _db_schema_path] = [module_dir_path, _module_dir_path].map(v => path.join(v, "res", path.basename(db_path)));

            if (!scriptLib.fs_areSame(db_schema_path, _db_schema_path)) {

                console.log(`Need db update ${db_path}`);

                scriptLib.fs_move("COPY", _db_schema_path, db_path);

                scriptLib.execSync(`chown ${unix_user}:${unix_user} ${db_path}`);

            }

        }

        const _working_directory_path = path.join(_module_dir_path, path.basename(working_directory_path));

        scriptLib.execSyncTrace(`chown -R ${unix_user}:${unix_user} ${_working_directory_path}`);

        scriptLib.fs_move("MOVE", working_directory_path, _working_directory_path, "asterisk/etc");

        for (const name of scriptLib.fs_ls(_working_directory_path)) {

            if (name === path.basename(dongle_dir_path)) {
                continue;
            }

            scriptLib.fs_move("MOVE", _working_directory_path, working_directory_path, name);

        }

        for (const name of to_distribute_rel_paths) {
            scriptLib.fs_move("MOVE", _module_dir_path, module_dir_path, name);
        }

        (() => {

            const _dongle_dir_path = path.join(_working_directory_path, path.basename(dongle_dir_path));

            scriptLib.execSyncTrace(`${dongle.installer_cmd} update --path ${_dongle_dir_path}`);

        })();

        scriptLib.execSyncTrace(`rm -r ${_module_dir_path}`);

        console.log(scriptLib.colorize("Update success", "GREEN"));


    } else if (versionStatus === "MAJOR") {

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
            `wget -q -O - semasim.com/installer.sh | sudo bash`,
            `cron_remove`,
            `rm ${reinstall_script_path}`,
            ``
        ].join("\n"));

        scriptLib.spawnAndDetach("/bin/bash", [reinstall_script_path], undefined, "/tmp/semasim_reinstall.log");

        return "EXIT";

    }

    return "LAUNCH";

}

async function program_action_tarball() {

    scriptLib.enableCmdTrace();

    if (!fs.existsSync(node_path)) {
        throw new Error(`Missing node`);
    }

    const _module_dir_path = path.join("/tmp", path.basename(module_dir_path));

    scriptLib.execSyncTrace(`rm -rf ${_module_dir_path}`);

    for (const name of to_distribute_rel_paths) {
        scriptLib.fs_move("COPY", module_dir_path, _module_dir_path, name);
    }

    const _node_modules_path = path.join(_module_dir_path, "node_modules");

    for (const name of ["@types", "typescript"]) {

        scriptLib.execSyncTrace(`rm -r ${path.join(_node_modules_path, name)}`);

    }

    scriptLib.execSyncTrace(`find ${_node_modules_path} -type f -name "*.ts" -exec rm -rf {} \\;`);

    const _working_directory_path = path.join(_module_dir_path, path.basename(working_directory_path));

    await fetch_asterisk_and_dongle(_working_directory_path);

    scriptLib.fs_move(
        "COPY",
        working_directory_path,
        _working_directory_path,
        "asterisk/lib/asterisk/modules/chan_dongle.so"
    );

    scriptLib.execSyncTrace([
        "tar -czf",
        path.join(module_dir_path, `semasim_${scriptLib.sh_eval("uname -m")}.tar.gz`),
        `-C ${_module_dir_path} .`
    ].join(" ")
    );

    scriptLib.execSyncTrace(`rm -r ${_module_dir_path}`);


}

async function install() {

    scriptLib.unixUser.create(unix_user, working_directory_path);

    if (!getIsProd()) {

        if (!fs.existsSync(node_path)) {
            throw new Error("Missing copy of node");
        }

        scriptLib.enableCmdTrace();

        await fetch_asterisk_and_dongle(working_directory_path);

    }

    await (async function configure_asterisk() {

        for (let package_name of [
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
                ].join("\n"), "utf8"
            )
        );


        fs.writeFileSync(
            path.join(ast_etc_dir_path, "rtp.conf"),
            Buffer.from(
                [
                    `[general]`,
                    `icesupport=yes`,
                    `stunaddr=stun.semasim.com:19302`,
                    ``
                ].join("\n"), "utf8"
            )
        );


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

        odbc.configure();

        scriptLib.createSymlink(ast_dir_path, ast_dir_link_path);

        scriptLib.fs_move("COPY", path.join(module_dir_path, "res"), working_directory_path, ast_db_path);

    })();

    scriptLib.fs_move("COPY", path.join(module_dir_path, "res"), working_directory_path, semasim_db_path);

    shellScripts.create();

    scriptLib.execSync(`chown -R ${unix_user}:${unix_user} ${working_directory_path}`);

    dongle.install();

    scriptLib.systemd.createConfigFile(srv_name, path.join(__dirname, "main.js"), node_path, "ENABLE", "START");


}

function uninstall(verbose: false | "VERBOSE" = false) {

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

    runRecover("Terminating running instance ... ", () => scriptLib.stopProcessSync(pidfile_path, "SIGUSR2"));

    runRecover("Removing systemd service ... ", () => scriptLib.systemd.deleteConfigFile(srv_name));

    runRecover("Uninstalling chan_dongle_extended ...", () => dongle.uninstall());

    runRecover("Restoring odbc ... ", () => odbc.restore());

    runRecover("Removing uninstaller from path ...", () => shellScripts.remove_symbolic_links());

    runRecover("Deleting run link to internal asterisk ... ", () => scriptLib.execSyncQuiet(`rm -r ${ast_dir_link_path}`));

    runRecover("Deleting unix user ... ", () => scriptLib.unixUser.remove(unix_user));

    if (!getIsProd()) {

        runRecover("Deleting working directory ... ", () => scriptLib.execSyncQuiet(`rm -r ${working_directory_path}`));

    }

}

/** Create dir if does not exist, keep the files in it if it does */
async function fetch_asterisk_and_dongle(dest_dir_path: string) {

    const arch = scriptLib.sh_eval("uname -m");

    await scriptLib.download_and_extract_tarball(
        `https://github.com/garronej/asterisk/releases/download/latest/asterisk_${arch}.tar.gz`,
        dest_dir_path,
        "MERGE"
    );

    await scriptLib.download_and_extract_tarball(
        `https://github.com/garronej/dongle/releases/download/latest/dongle_${arch}.tar.gz`,
        path.join(dest_dir_path, path.basename(dongle_dir_path)),
        "OVERWRITE IF EXIST"
    );

}

namespace dongle {


    export const installer_cmd = `${dongle_node_path} ${path.join(dongle_bin_dir_path, "installer.js")}`;

    export function install() {

        scriptLib.execSyncTrace([
            `${installer_cmd} install`,
            `--asterisk_main_conf ${ast_main_conf_path}`,
            `--disable_sms_dialplan`,
            `--ast_include_dir_path ${path.join(ast_dir_path, "include")}`,
            `--enable_ast_ami_on_port 48397`,
            `--unix_user ${unix_user}`,
            `--do_not_create_systemd_conf`,
            getIsProd() ? "--assume_chan_dongle_installed" : ""
        ].join(" "));

        (function merge_installed_pkg() {

            const dongle_installed_pkg_record =
                path.join(dongle_dir_path, path.basename(installed_pkg_record_path));

            if (fs.existsSync(dongle_installed_pkg_record)) {

                const pkg_list: string[] = require(dongle_installed_pkg_record);

                for (let pkg_name of pkg_list) {

                    scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, pkg_name);

                }

            }

        })();

    }

    export function uninstall() {

        scriptLib.execSyncQuiet(`${installer_cmd} uninstall`);

    }

}

namespace shellScripts {

    export function create(): void {

        process.stdout.write(`Creating shell scripts ... `);

        scriptLib.createScript(
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

        const uninstaller_sh_path = path.join(working_directory_path, "uninstaller.sh");

        scriptLib.createScript(
            uninstaller_sh_path,
            [
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
                `   ${node_path} ${__filename} uninstall`,
                `   ${getIsProd() ? `rm -r ${module_dir_path}` : ""}`,
                `else`,
                `   echo "If you wish to uninstall chan-dongle-extended call this script with 'run' as argument:"`,
                `   echo "$0 run"`,
                `fi`,
                ``
            ].join("\n")
        );

        scriptLib.createSymlink(uninstaller_sh_path, uninstaller_link_path);

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

if (require.main === module) {

    process.once("unhandledRejection", error => { throw error; });

    scriptLib.exit_if_not_root();

    scriptLib.apt_get_install.onInstallSuccess = package_name =>
        scriptLib.apt_get_install.record_installed_package(installed_pkg_record_path, package_name);

    import("commander").then(program => {

        program
            .command("install")
            .action(() => program_action_install())
            ;


        program
            .command("uninstall")
            .action(() => program_action_uninstall())
            ;

        program
            .command("update")
            .option(`--path [{path}]`)
            .action(() => program_action_update())
            ;

        program
            .command("tarball")
            .action(() => program_action_tarball())
            ;


        program.parse(process.argv);

    });

}
