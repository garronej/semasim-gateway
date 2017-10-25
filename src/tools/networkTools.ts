import * as dns from "dns";
import * as network from "network";

export function resolveSrv(hostname: string): Promise<dns.SrvRecord[]> {

    return new Promise<dns.SrvRecord[]>(
        (resolve, reject) => dns.resolveSrv(
            hostname,
            (error, addresses) =>
                (error || !addresses.length) ? reject(error || new Error("no record")) : resolve(addresses)
        )
    );

}

export async function getActiveInterfaceIp(): Promise<string> {

    getActiveInterfaceIp.previousResult = await new Promise<string>(
        (resolve, reject) =>
            network.get_active_interface((error, obj) => error ? reject(error) : resolve(obj.ip_address))
    );

    return getActiveInterfaceIp.previousResult;

}

export namespace getActiveInterfaceIp {

    export let previousResult: string | undefined = undefined;

}
