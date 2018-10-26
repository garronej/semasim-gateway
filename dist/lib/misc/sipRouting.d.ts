import * as sipLibrary from "ts-sip";
export declare function readImsi(sipPacket: sipLibrary.Packet): string;
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
export declare namespace cid {
    /** on backend when ua connect */
    function generate(uaSocket: {
        remoteAddress: string;
        remotePort: number;
    }, timestamp?: number): string;
    function parse(connectionId: string): {
        "timestamp": number;
        "uaSocket": {
            "remoteAddress": string;
            "remotePort": number;
        };
    };
    /**
     * Include a connection id in a sipRequest.
     * This must be applied to every new sip request.
     * ( No need to include the connection id on sip response
     * as it is already present )
     */
    function set(sipRequestNextHop: sipLibrary.Request, connectionId: string): void;
    /** Read the connection id */
    function read(sipPacket: sipLibrary.Packet): string;
}
