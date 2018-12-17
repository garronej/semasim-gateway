export declare function genRetryDelay(): number;
export declare function getVersion(): Promise<{
    value: string;
    status: "UP TO DATE" | "MAJOR" | "MINOR" | "PATCH";
}>;
