import { Socket } from "../Socket";
export declare class Server {
    readonly handlers: Server.Handlers;
    constructor(handlers: Server.Handlers);
    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    startListening(socket: Socket): void;
}
export declare namespace Server {
    type Handler<Params, Response> = {
        sanityCheck?: (params: Params) => boolean;
        handler: (params: Params, fromSocket: Socket) => Promise<Response>;
    };
    type Handlers = {
        [methodName: string]: Handler<any, any>;
    };
}
