export declare function genRetryDelay(): number;
export declare type Version = {
    major: number;
    minor: number;
    patch: number;
};
export declare namespace Version {
    function parse(version: string): Version;
    function stringify(v: Version): string;
    /**
     *
     * v1  <  v2  => -1
     * v1 === v2  => 0
     * v1  >  v2  => 1
     *
     */
    function compare(v1: Version, v2: Version): -1 | 0 | 1;
}
export declare function getVersion(): Promise<{
    value: string;
    status: "UP TO DATE" | "MAJOR" | "MINOR" | "PATCH";
}>;
