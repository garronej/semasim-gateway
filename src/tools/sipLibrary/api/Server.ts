
import { Socket } from "../Socket";
import * as misc from "../misc";
import { ApiMessage, keepAlive } from "./ApiMessage";

export class Server {

    constructor(
        public readonly handlers: Server.Handlers
    ) {

        (()=>{

            const methodName = keepAlive.methodName;
            type Params = keepAlive.Params;
            type Response = keepAlive.Response;


            let handler: Server.Handler<Params, Response>= {
                "sanityCheck": params => params === "PING", 
                "handler": async ()=> "PONG"
            };

            this.handlers[methodName]= handler;

        })();

    }

    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    public startListening(socket: Socket) {

        socket.evtRequest.attachExtract(
            sipRequest => ApiMessage.Request.matchSip(sipRequest),
            async sipRequest => {

                let methodName = ApiMessage.Request.readMethodName(sipRequest);
                let params: any;

                try{

                    var { handler, sanityCheck }= this.handlers[methodName];

                }catch{

                    console.log(`Method ${methodName} not implemented`.red);
                    socket.destroy();
                    return;

                }

                try {

                    params = ApiMessage.parsePayload(
                        sipRequest, 
                        sanityCheck
                    );

                }catch{

                    console.log("Api request malformed".red);
                    socket.destroy();
                    return;

                }

                let response: any;

                try {

                    response = await handler(params, socket);

                }catch{

                    console.log("Request made handler throw error".red);
                    socket.destroy();
                    return;

                }

                let sipRequestResp = ApiMessage.Response.buildSip(
                    ApiMessage.readActionId(sipRequest),
                    response
                );

                misc.buildNextHopPacket.pushVia(
                    socket, 
                    sipRequestResp
                );

                socket.write(sipRequestResp);

            }
        );

    }

}

export namespace Server {

    export type Handler<Params, Response> = {
        sanityCheck?: (params: Params) => boolean;
        handler: (params: Params, fromSocket: Socket) => Promise<Response>;
    };

    export type Handlers = {
        [methodName: string]: Handler<any, any>;
    };

}