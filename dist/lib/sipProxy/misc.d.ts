import * as sipLibrary from "ts-sip";
export declare function readImsi(sipPacket: sipLibrary.Packet): string;
export declare namespace cid {
    /** on backend on client connection */
    function generate(clientSocket: {
        remoteAddress: string;
        remotePort: number;
    }, timestamp?: number): string;
    function parse(connectionId: string): {
        "timestamp": number;
        "clientSocketRemoteAddress": string;
        "clientSocketRemotePort": number;
    };
    /** To set on request from asteriskSocket (gw) and from clientSocket (backend) */
    function set(sipRequestNextHop: sipLibrary.Request, connectionId: string): void;
    /** read when ever we need to root a packet */
    function read(sipPacket: sipLibrary.Packet): string;
}
