import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as WebSocket from "ws";

import * as types from "./types";
import * as core from "./core";
import * as misc from "./misc";

import * as _debug from "debug";
let debug = _debug("_tools/sipLibrary/Socket");


//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {


    /** To store data contextually link to this socket */
    public readonly misc: any = {};

    public readonly evtResponse = new SyncEvent<types.Response>();
    public readonly evtRequest = new SyncEvent<types.Request>();

    public readonly evtClose = new SyncEvent<boolean>();
    public readonly evtConnect = new VoidSyncEvent();

    public readonly evtTimeout = new VoidSyncEvent();

    /**Emit chunk of data as received by the underlying connection*/
    public readonly evtData = new SyncEvent<Buffer>();

    public readonly evtSentPacket= new SyncEvent<types.Packet>();

    private static readonly maxBytesHeaders = 7820;
    private static readonly maxContentLength = 24624;

    private __localPort__ = NaN;
    private __remotePort__ = NaN;
    private __localAddress__ = "";
    private __remoteAddress__ = "";

    public get localPort() {
        return this.spoofedAddressAndPort.localPort || this.__localPort__;
    }

    public get remotePort() {
        return this.spoofedAddressAndPort.remotePort || this.__remotePort__;
    }

    public get localAddress() {
        return this.spoofedAddressAndPort.localAddress || this.__localAddress__;
    }

    public get remoteAddress() {
        return this.spoofedAddressAndPort.remoteAddress || this.__remoteAddress__;
    }

    constructor(
        webSocket: WebSocket,
        addrAndPorts: Socket.AddrAndPorts
    );
    constructor(
        socket: net.Socket, 
        spoofedAddrAndPorts?: Partial<Socket.AddrAndPorts>
    );
    constructor(
        private readonly connection: WebSocket | net.Socket, 
        private readonly spoofedAddressAndPort: Partial<Socket.AddrAndPorts>= {}
    ) {

        let streamParser = core.makeStreamParser(
            sipPacket => misc.matchRequest(sipPacket) ?
                this.evtRequest.post(sipPacket) :
                this.evtResponse.post(sipPacket)
            ,
            () => this.connection.emit("error", new Error("Flood")),
            Socket.maxBytesHeaders,
            Socket.maxContentLength
        );

        (this.connection as any)
            .once("error", () => this.connection.emit("close", true))
            .once("close", had_error => {


                if (Socket.matchWebSocket(this.connection)) {
                    this.connection.terminate();
                } else {
                    this.connection.destroy();
                }

                this.evtClose.post(had_error === true);

            })
            .on(
            Socket.matchWebSocket(this.connection) ? "message" : "data",
            (data: Buffer | string) => {

                if (typeof data === "string") {

                    data= Buffer.from(data, "utf8");

                }

                this.evtData.post(data);

                try {

                    streamParser(data);

                } catch (error) {

                    debug("Stream parser error");

                    this.connection.emit("error", error);

                }


            }
        );

        if (Socket.matchWebSocket(this.connection)) {

            this.evtConnect.post(); //For post count

        } else {

            this.connection.setMaxListeners(Infinity)

            const setAddrAndPort = ((c: net.Socket) => (() => {
                this.__localPort__ = c.localPort;
                this.__remotePort__ = c.remotePort;
                this.__localAddress__ = c.localAddress;
                this.__remoteAddress__ = c.remoteAddress;
            }))(this.connection);

            setAddrAndPort();

            if (this.connection.localPort) {

                this.evtConnect.post(); //For post count

            } else {

                this.connection.once(
                    this.connection["encrypted"] ? "secureConnect" : "connect",
                    () => {
                        setAddrAndPort();
                        this.evtConnect.post();
                    }
                );

            }

        }

    }


    public readonly setKeepAlive: net.Socket['setKeepAlive'] = (...inputs) =>
            Socket.matchWebSocket(this.connection) ?
                undefined :
                this.connection.setKeepAlive.apply(this.connection, inputs)
    ;


    /** Return true if sent successfully */
    public write(sipPacket: types.Packet): boolean | Promise<boolean> {

        if( !this.evtConnect.postCount ){

            throw new Error("Trying to write before socket connect");

        }

        if (this.evtClose.postCount) {

            debug("The socket you try to write on is closed");

            return new Promise(resolve=> {});

        }


        if (misc.matchRequest(sipPacket)) {

            let maxForwardsHeaderValue = sipPacket.headers["max-forwards"];

            if (maxForwardsHeaderValue !== undefined) {

                let maxForwards = parseInt(maxForwardsHeaderValue);

                if (maxForwards < 0) {
                    debug("Avoid writing, max forward reached");
                    return false;
                }

            }

        }

        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        let data= core.toData(sipPacket);

        let out: Promise<boolean> | true;

        if (Socket.matchWebSocket(this.connection)) {

            out= new Promise<boolean>(
                resolve => (this.connection as WebSocket)
                    .send(data, { "binary": true }, error => resolve(error ? true : false))
            );

        } else {

            let flushed = this.connection.write(data);

            if (flushed) {

                out= true;

            } else {

                let boundTo = [];

                out= Promise.race([
                    new Promise<false>(
                        resolve => this.evtClose.attachOnce(boundTo, () => resolve(false))
                    ),
                    new Promise<true>(
                        resolve => (this.connection as net.Socket).once("drain", () => {
                            this.evtClose.detach(boundTo);
                            resolve(true);
                        })
                    )
                ]);

            }

        }

        ((out instanceof Promise)?out:Promise.resolve(true))
            .then(isSent => {

                if( isSent ){

                    this.evtSentPacket.post(sipPacket)

                }

            })
            ;

        return out;

    }


    public destroy() {

        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */

        this.connection.emit("close", false);

    }

    public get protocol(): "TCP" | "TLS" | "WSS" {

        if (Socket.matchWebSocket(this.connection)) {
            return "WSS";
        } else {
            return this.connection["encrypted"] ? "TLS" : "TCP";
        }

    }

    /** Return a clone of the packet ready for next hop */
    public buildNextHopPacket(
        sipRequest: types.Request
    ): types.Request;
    public buildNextHopPacket(
        sipResponse: types.Response
    ): types.Response;
    public buildNextHopPacket(
        sipPacket: types.Packet
    ): types.Packet;
    public buildNextHopPacket(
        sipPacket: types.Packet
    ): types.Packet {
        return misc.buildNextHopPacket(this, sipPacket);
    }


}

export namespace Socket {

    export type AddrAndPorts = {
        localPort: number;
        remotePort: number;
        localAddress: string;
        remoteAddress: string;
    };

    export function matchWebSocket(socket: net.Socket | WebSocket): socket is WebSocket {
        return (socket as WebSocket).terminate !== undefined;
    }

}
