import * as logger_ from "logger";
export declare const logger: {
    log: (message: any, ...optionalParams: any[]) => Promise<void>;
    debugFactory: () => (message: any, ...optionalParams: any[]) => Promise<void>;
    disableStdout(): void;
    get_module_dir_path(from_dir_path?: string | undefined): string;
    file: typeof logger_.file;
    colors: typeof logger_.colors;
};
