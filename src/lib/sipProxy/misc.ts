import * as stringTransform from "transfer-tools/dist/lib/stringTransform";
import * as sipLibrary from "../../tools/sipLibrary";

/** 
 * Return true if it's a sipRequest originated of UA 
 * or if it's a sipResponse of a request originated by UA. 
 * */
function isRequestFromClient(sipPacket: sipLibrary.Packet): boolean {

    //TODO: make private

    return sipPacket.headers.via[
        sipPacket.headers.via.length - 1
    ].protocol !== "TCP";

}

export function readImsi(sipPacket: sipLibrary.Packet): string {

    return sipLibrary.parseUri(
        sipPacket.headers[
            isRequestFromClient(sipPacket) ? "from" : "to"
        ].uri
    ).user!;

}

export namespace cid {

    const { enc, dec } = stringTransform.transcode("base64", { "=": "_" });

    /** on backend on client connection */
    export function generate(
        clientSocket: { remoteAddress: string; remotePort: number; },
        timestamp = Date.now()
    ): string {
        return enc(
            `${timestamp}:${clientSocket.remoteAddress}:${clientSocket.remotePort}`
        );
    }

    export function parse(connectionId: string) {

        let [a, b, c] = dec(connectionId).split(":");

        return {
            "timestamp": parseInt(a),
            "clientSocketRemoteAddress": b as string,
            "clientSocketRemotePort": parseInt(c)
        };

    }

    const key = "connection_id";

    /** To set on request from asteriskSocket (gw) and from clientSocket (backend) */
    export function set(sipRequestNextHop: sipLibrary.Request, connectionId: string): void {

        sipRequestNextHop.headers[
            isRequestFromClient(sipRequestNextHop) ? "from" : "to"
        ].params[key] = connectionId;

    }

    /** read when ever we need to root a packet */
    export function read(sipPacket: sipLibrary.Packet): string {

        return sipPacket.headers[
            isRequestFromClient(sipPacket) ? "from" : "to"
        ].params[key]!;

    }

}

