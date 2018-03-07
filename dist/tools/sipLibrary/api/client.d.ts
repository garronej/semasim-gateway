import { Socket } from "../Socket";
export declare function sendRequest<Params, Response>(socket: Socket, methodName: string, params: Params, extra?: {
    timeout?: number;
    sanityCheck?: (response: Response) => boolean;
}): Promise<Response>;
export declare class SendRequestError extends Error {
    readonly methodName: string;
    readonly params: any;
    readonly cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE";
    readonly misc: {};
    constructor(methodName: string, params: any, cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE");
}
export declare function enableKeepAlive(socket: Socket, interval?: number): void;
