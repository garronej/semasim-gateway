/// <reference types="ws" />
/// <reference types="node" />
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as WebSocket from "ws";
import * as types from "./types";
export declare class Socket {
    /** To store data contextually link to this socket */
    readonly misc: any;
    readonly evtResponse: SyncEvent<types.Response>;
    readonly evtRequest: SyncEvent<types.Request>;
    readonly evtClose: SyncEvent<boolean>;
    readonly evtConnect: VoidSyncEvent;
    private timer;
    readonly evtTimeout: VoidSyncEvent;
    readonly evtData: SyncEvent<string>;
    private static readonly maxBytesHeaders;
    private static readonly maxContentLength;
    localPort: number;
    remotePort: number;
    localAddress: string;
    remoteAddress: string;
    localAddressPublic: string | undefined;
    private readonly connection;
    constructor(webSocket: WebSocket, addrAndPorts: Socket.AddrAndPorts, timeoutDelay?: number);
    constructor(socket: net.Socket, timeoutDelay?: number);
    readonly setKeepAlive: net.Socket['setKeepAlive'];
    /** Return true if sent successfully */
    write(sipPacket: types.Packet): boolean | Promise<boolean>;
    destroy(): void;
    readonly protocol: "TCP" | "TLS" | "WSS";
    addViaHeader(sipRequest: types.Request, extraParams?: Record<string, string>): string;
    addPathHeader(sipRegisterRequest: types.Request, extraParams?: Record<string, string>): void;
    /**
     *
     * Return stringified:
     * <sip:${host||this.localAddress}:this.localPort;transport=this.protocol;lr>
     *
     */
    private buildRoute(extraParams?);
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
    shiftRouteAndUnshiftRecordRoute(sipRequest: types.Request): void;
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
    pushRecordRoute(sipResponse: types.Response, isFirstHop: boolean): void;
}
export declare namespace Socket {
    type AddrAndPorts = {
        localPort: number;
        remotePort: number;
        localAddress: string;
        remoteAddress: string;
    };
    function matchWebSocket(socket: net.Socket | WebSocket): socket is WebSocket;
}
