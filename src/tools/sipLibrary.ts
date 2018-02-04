import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as sip from "sip";
import * as _sdp_ from "sip/sdp";
import * as WebSocket from "ws";

import * as _debug from "debug";
let debug = _debug("_tools/sipLibrary");

export const regIdKey = "reg-id";
export const instanceIdKey = "+sip.instance";

export const parseSdp: (rawSdp: string) => any = _sdp_.parse;
export const stringifySdp: (sdp: any) => string = _sdp_.stringify;

export function filterSdpCandidates(
    keep: { host: boolean; srflx: boolean; relay: boolean; },
    sdp: string
): string {

    let shouldKeepCandidate = (candidateLine: string): boolean => {

        return (
            (keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/))
        );

    };

    let parsedSdp = parseSdp(sdp);

    let arr = parsedSdp.m[0].a;

    for (let line of [...arr]) {

        if (!line.match(/^candidate/)) continue;

        if (!shouldKeepCandidate(line)) {
            arr.splice(arr.indexOf(line), 1);
        }

    }

    return stringifySdp(sdp);


}

export function readSrflxAddrInSdp(sdp: string): string | undefined {

    for (let m_i of parseSdp(sdp).m) {

        if (m_i.media !== "audio") continue;

        for (let a_i of m_i.a) {

            let match = a_i.match(
                /^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/
            );

            if (match) return match[1];

        }
    }

    return undefined;

}

//TODO: only on gw remove ?
export function isPlainMessageRequest(sipRequest: sip.Request): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/)
    );

}

export const makeStreamParser: (
    handler: (sipPacket: Packet) => void,
    onFlood: () => void,
    maxBytesHeaders: number,
    maxContentLength: number
) => ((dataAsBinaryString: string) => void) = sip.makeStreamParser;

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    public static matchWebSocket(socket: net.Socket | WebSocket): socket is WebSocket {
        return (socket as WebSocket).terminate !== undefined;
    }

    public misc: any = {};

    public readonly evtResponse = new SyncEvent<Response>();
    public readonly evtRequest = new SyncEvent<Request>();

    public readonly evtClose = new SyncEvent<boolean>();
    public readonly evtConnect = new VoidSyncEvent();

    private timer: NodeJS.Timer;
    public readonly evtTimeout = new VoidSyncEvent();

    public readonly evtData = new SyncEvent<string>();

    private static readonly maxBytesHeaders = 7820;
    private static readonly maxContentLength = 24624;

    public localPort = NaN;
    public remotePort = NaN;
    public localAddress = "";
    public remoteAddress = "";

    private readonly connection: net.Socket | WebSocket;

    constructor(
        webSocket: WebSocket,
        addrAndPorts: Socket.AddrAndPorts,
        timeoutDelay?: number
    );
    constructor(socket: net.Socket, timeoutDelay?: number);
    constructor(...inputs: any[]) {

        this.connection = inputs[0];


        let timeoutDelay: number | undefined;

        let addrAndPorts: Socket.AddrAndPorts | undefined;

        if (Socket.matchWebSocket(this.connection)) {

            addrAndPorts = inputs[1];
            timeoutDelay = inputs[2];

            debug({ addrAndPorts });

        } else {

            addrAndPorts = undefined;
            timeoutDelay = inputs[1];

        }

        let streamParser = makeStreamParser(
            sipPacket => matchRequest(sipPacket) ?
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

                if (timeoutDelay) clearTimeout(this.timer);

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

                if (timeoutDelay) {

                    clearTimeout(this.timer);

                    this.timer = setTimeout(() => this.evtTimeout.post(), timeoutDelay);

                }

                let dataAsBinaryString;

                if (typeof data === "string") {

                    dataAsBinaryString = (new Buffer(data, "utf8")).toString("binary");

                } else {

                    dataAsBinaryString = data.toString("binary");

                }

                this.evtData.post(dataAsBinaryString);

                try {

                    streamParser(dataAsBinaryString);

                } catch (error) {

                    debug("Stream parser error");

                    this.connection.emit("error", error);

                }


            }
        );

        if (Socket.matchWebSocket(this.connection)) {

            this.localPort = addrAndPorts!.localPort;
            this.remotePort = addrAndPorts!.remotePort;
            this.localAddress = addrAndPorts!.localAddress;
            this.remoteAddress = addrAndPorts!.remoteAddress;

            this.evtConnect.post(); //For post count

        } else {

            this.connection.setMaxListeners(Infinity)

            let setAddrAndPort = ((c: net.Socket) => (() => {
                this.localPort = c.localPort;
                this.remotePort = c.remotePort;
                this.localAddress = c.remoteAddress;
                this.remoteAddress = c.remoteAddress;
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

    public readonly setKeepAlive: net.Socket['setKeepAlive'] =
        (...inputs) =>
            Socket.matchWebSocket(this.connection) ?
                undefined :
                this.connection.setKeepAlive.apply(this.connection, inputs);
    ;


    /** Return true if sent successfully */
    public write(sipPacket: Packet): boolean | Promise<boolean> {

        if (this.evtClose.postCount) {

            debug("The socket you try to write on is closed");

            return false;

        }

        if (matchRequest(sipPacket)) {

            let maxForwards = parseInt(sipPacket.headers["max-forwards"]);

            if (isNaN(maxForwards)) {
                throw new Error("Write error, max-forwards header should be defined");
            }

            if (maxForwards === 0) {
                debug("Avoid writing, max forward reached");
                return false;
            }

            sipPacket.headers["max-forwards"] = `${maxForwards - 1}`;

        }

        if (!sipPacket.headers.via.length) {
            debug("Prevent sending packet without via header");
            return false;
        }

        //TODO: this can potentially throw, make sure it's ok
        let data = new Buffer(stringify(sipPacket), "binary");

        if (Socket.matchWebSocket(this.connection)) {

            return new Promise<boolean>(
                resolve => (this.connection as WebSocket)
                    .send(data, { "binary": true }, error => resolve(error ? true : false))
            );

        } else {

            let flushed = this.connection.write(data);

            if (flushed) {

                return true;

            } else {

                let boundTo = [];

                return Promise.race([
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

    public addViaHeader(
        sipRequest: Request,
        extraParams: Record<string, string> = {}
    ): string {

        let branch = (() => {

            let via = sipRequest.headers.via;

            return via.length ? `z9hG4bK-${via[0].params["branch"]}` : generateBranch();

        })();

        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": this.protocol,
            "host": this.localAddress,
            "port": this.localPort,
            "params": {
                ...extraParams,
                branch,
                "rport": null
            }
        });

        return branch;

    }


    public addPathHeader(
        sipRegisterRequest: Request,
        host?: string,
        extraParams?: Record<string, string>
    ) {

        if (!sipRegisterRequest.headers.path) {
            sipRegisterRequest.headers.path = [];
        }

        sipRegisterRequest.headers.path!.unshift(
            this.buildRoute(host, extraParams)
        );

    }

    /**
     * 
     * Return stringified:
     * <sip:${host||this.localAddress}:this.localPort;transport=this.protocol;lr>
     * 
     */
    private buildRoute(
        host: string = this.localAddress,
        extraParams: Record<string, string> = {}
    ): AoRWithParsedUri {

        return {
            "uri": {
                ...parseUri(`sip:${host}:${this.localPort}`),
                "params": {
                    ...extraParams,
                    "transport": this.protocol,
                    "lr": null
                }
            },
            "params": {}
        };

    }

    /**
     * 
     * Assert sipRequest is NOT register.
     * 
     * HOP_X ] => [ LOCAL_X, LOCAL_this ] => [ HOP_Y
     * 
     * Before: 
     * Route: LOCAL_X, HOP_Y
     * Record-Route: HOP_X
     * 
     * After:
     * Route: HOP_Y
     * Record-Route: LOCAL_this, HOP_X
     * 
     */
    public shiftRouteAndUnshiftRecordRoute(
        sipRequest: Request,
        host?: string
    ) {

        if (sipRequest.headers.route) sipRequest.headers.route.shift();

        if (!sipRequest.headers.contact) return;

        if (!sipRequest.headers["record-route"]) sipRequest.headers["record-route"] = [];

        sipRequest.headers["record-route"]!.unshift(this.buildRoute(host));

    }

    /**
     * 
     * HOP_X <= [ LOCAL_this, LOCAL_Y ] <= HOP_Y
     * 
     * Before: 
     * Record-Route: HOP_X, LOCAL_Y, HOP_Y
     * 
     * After:
     * Record-Route: HOP_X, LOCAL_this, HOP_Y
     *
     * NOTE: We use a different implementation but end to end result is same.
     * In consequence isFirst hop must be set to true if and only if this is 
     * this first hop of the response.
     *
     */
    public pushRecordRoute(
        sipResponse: Response,
        isFirstHop: boolean,
        host?: string
    ) {

        if (!sipResponse.headers["record-route"]) return;

        if (isFirstHop) sipResponse.headers["record-route"] = [];

        sipResponse.headers["record-route"]!.push(this.buildRoute(host));

    }


}

export namespace Socket {

    export type AddrAndPorts = {
        localPort: number;
        remotePort: number;
        localAddress: string;
        remoteAddress: string;
    };

}

export const stringify: (sipPacket: Packet) => string = sip.stringify;
export const parseUri: (uri: string) => ParsedUri = sip.parseUri;
export const generateBranch: () => string = sip.generateBranch;
export const stringifyUri: (parsedUri: ParsedUri) => string = sip.stringifyUri;
export const parse: (rawSipPacket: string) => Packet = sip.parse;

export function parsePath(path: string): AoRWithParsedUri[] {

    const message = sip.parse([
        `DUMMY _ SIP/2.0`,
        `Path: ${path}`,
        "\r\n"
    ].join("\r\n")) as Request;

    return message.headers.path!;

}

export function parseOptionTags(headerFieldValue: string | undefined): string[] {

    if (!headerFieldValue) return [];

    return headerFieldValue.split(",").map(optionTag => optionTag.replace(/\s/g, ""));

}

export function hasOptionTag(
    headers: Headers,
    headerField: string,
    optionTag: string
): boolean {

    let headerFieldValue = headers[headerField];

    let optionTags = parseOptionTags(headerFieldValue);

    return optionTags.indexOf(optionTag) >= 0;

}

export function addOptionTag(
    headers: Headers,
    headerField: string,
    optionTag: string
) {

    if (hasOptionTag(headers, headerField, optionTag))
        return;

    let optionTags = parseOptionTags(headers[headerField]);

    optionTags.push(optionTag);

    headers[headerField] = optionTags.join(", ");

}

export function matchRequest(sipPacket: Packet): sipPacket is Request {
    return "method" in sipPacket;
}

export type TransportProtocol = "TCP" | "UDP" | "TLS" | "WSS";

export interface Via {
    version: string;
    protocol: string;
    host: string;
    port: number;
    params: Record<string, string | null>
}

export interface ParsedUri {
    schema: string;
    user: string | undefined;
    password: string | undefined;
    host: string | undefined;
    port: number;
    params: Record<string, string | null>;
    headers: Record<string, string>;
}

export type AoR = {
    name: string | undefined;
    uri: string;
    params: Record<string, string | null>
};

export type AoRWithParsedUri = {
    uri: ParsedUri;
    params: Record<string, string | null>
}

export type Headers = {
    via: Via[];
    from: AoR;
    to: AoR;
    cseq: { seq: number; method: string; }
    contact?: AoR[];
    path?: AoRWithParsedUri[];
    route?: AoRWithParsedUri[];
    "record-route"?: AoRWithParsedUri[];
    [key: string]: string | any;
}

export interface PacketBase {
    uri: string;
    version: string;
    headers: Headers;
    content: string;
}

export interface Request extends PacketBase {
    method: string;
}

export interface Response extends PacketBase {
    status: number;
    reason: string;
}

export type Packet = Request | Response;
