import * as sip from "../tools/sipLibrary";
export declare class Server {
    readonly handlers: Server.Handlers;
    readonly sanityChecks: Server.SanityChecks;
    constructor(handlers: Server.Handlers, sanityChecks?: Server.SanityChecks);
    startListening(socket: sip.Socket): void;
}
export declare namespace Server {
    type Handlers = {
        [methodName: string]: (params: any, fromSocket: sip.Socket) => Promise<any>;
    };
    type SanityChecks = {
        [methodName: string]: (params: any) => boolean;
    };
}
export declare class Client {
    readonly socket: sip.Socket;
    readonly keepAliveInterval: number;
    readonly sanityChecks: Client.SanityChecks;
    static getFromSocket(socket: sip.Socket): Client;
    constructor(socket: sip.Socket, keepAliveInterval?: number, sanityChecks?: Client.SanityChecks);
    sendRequest(methodName: string, params: any, timeout?: number): Promise<any>;
}
export declare namespace Client {
    type SanityChecks = {
        [methodName: string]: (response: any) => boolean;
    };
    class SendRequestError extends Error {
        readonly methodName: string;
        readonly params: any;
        readonly cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE";
        readonly misc: {};
        constructor(methodName: string, params: any, cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE");
    }
}
