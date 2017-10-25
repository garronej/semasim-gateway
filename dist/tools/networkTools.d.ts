/// <reference types="node" />
import * as dns from "dns";
export declare function resolveSrv(hostname: string): Promise<dns.SrvRecord[]>;
export declare function getActiveInterfaceIp(): Promise<string>;
export declare namespace getActiveInterfaceIp {
    let previousResult: string | undefined;
}
