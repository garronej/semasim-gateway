export declare const module_dir_path: string;
export declare const unix_user = "semasim";
export declare const srv_name = "semasim";
export declare const working_directory_path: string;
export declare const node_path: string;
export declare const ast_dir_path: string;
export declare const ast_path: string;
export declare const dongle_dir_path: string;
export declare const dongle_node_path: string;
export declare const dongle_bin_dir_path: string;
export declare const ast_etc_dir_path: string;
export declare const ast_main_conf_path: string;
export declare const ast_db_path: string;
export declare const semasim_db_path: string;
export declare const ca_crt_path: string;
export declare const host_pem_path: string;
export declare const pidfile_path: string;
export declare const ast_sip_port = 48398;
export declare const ld_library_path_for_asterisk: string;
export declare function getEnv(): "DEV" | "PROD";
export declare namespace getEnv {
    let value: "DEV" | "PROD" | undefined;
}
export declare function getBaseDomain(): "semasim.com" | "dev.semasim.com";
export declare function program_action_update(): Promise<"LAUNCH" | "EXIT">;
export declare function buildAsteriskMainConfigFile(origin_dir_path: string): string;
