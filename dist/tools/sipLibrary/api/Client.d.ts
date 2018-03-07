import { Socket } from "../Socket";
export declare class Client {
    readonly socket: Socket;
    readonly keepAliveInterval: number;
    static getFromSocket(socket: Socket): Client;
    /** Must be called once the socket has connected */
    constructor(socket: Socket, keepAliveInterval?: number);
    sendRequest<Params, Response>(methodName: string, params: Params, extra?: {
        timeout?: number;
        sanityCheck?: (response: Response) => boolean;
    }): Promise<Response>;
}
export declare namespace Client {
    class SendRequestError extends Error {
        readonly methodName: string;
        readonly params: any;
        readonly cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE";
        readonly misc: {};
        constructor(methodName: string, params: any, cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE");
    }
}
