/* NOTE: Used in the browser. */

import { urlSafeB64 } from "./urlSafeBase64encoderDecoder";

//NOTE: Transpiled to ES5
import * as sipLibrary from "ts-sip";

/** 
 * Return true if it's a sipRequest originated of UA 
 * or if it's a sipResponse of a request originated by UA. 
 * */
function isRequestFromClient(sipPacket: sipLibrary.Packet): boolean {

    return sipPacket.headers.via[
        sipPacket.headers.via.length - 1
    ].protocol !== "TCP";

}

export function readImsi(sipPacket: sipLibrary.Packet): string {

    return sipLibrary.parseUri(
        sipPacket.headers[
            isRequestFromClient(sipPacket) ? "from" : "to"
        ].uri
    ).user!.match(/^([0-9]{15})/)![1]

}

/** 
 * 
 * connectionId: 
 * 
 * An uniq id of every UA connection to the backend 
 * Should be included in every sip packet.
 * The token enclose a timestamp of when the 
 * UA connection to the backend was established,
 * the public address of the UA and the source
 * port the UA used to connect.
 * 
 * */
export namespace cid {


    /** on backend when ua connect */
    export function generate(
        uaSocket: { remoteAddress: string; remotePort: number; },
        timestamp = Date.now()
    ): string {
        return urlSafeB64.enc(
            `${timestamp}:${uaSocket.remoteAddress}:${uaSocket.remotePort}`
        );
    }

    export function parse(connectionId: string) {

        const [a, b, c] = urlSafeB64.dec(connectionId).split(":");

        return {
            "timestamp": parseInt(a),
            "uaSocket": { 
                "remoteAddress": b, 
                "remotePort": parseInt(c) 
            }
        };

    }

    const key = "connection_id";

    /** 
     * Include a connection id in a sipRequest.
     * This must be applied to every new sip request.
     * ( No need to include the connection id on sip response 
     * as it is already present )
     */
    export function set(sipRequestNextHop: sipLibrary.Request, connectionId: string): void {

        sipRequestNextHop.headers[
            isRequestFromClient(sipRequestNextHop) ? "from" : "to"
        ].params[key] = connectionId;

    }

    /** Read the connection id */
    export function read(sipPacket: sipLibrary.Packet): string {

        return sipPacket.headers[
            isRequestFromClient(sipPacket) ? "from" : "to"
        ].params[key]!;

    }

}

