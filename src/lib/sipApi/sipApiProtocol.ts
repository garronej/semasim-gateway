import * as sipLibrary from "../../tools/sipLibrary";

import { JSON_CUSTOM as ttJC} from "transfer-tools";

const JSON_CUSTOM= ttJC.get();

namespace ApiMessage {

    const actionIdKey= "api-action-id";

    export function buildSip(
        actionId: number,
        payload: any
    ): sipLibrary.Request {

        let sipRequest = sipLibrary.parse([
            `API _ SIP/2.0`,
            "Max-Forwards: 1",
            "\r\n"
        ].join("\r\n")) as sipLibrary.Request;

        //TODO: should be set to [] already :(
        sipRequest.headers.via= [];

        sipRequest.headers[actionIdKey] = `${actionId++}`;

        sipRequest.content = JSON_CUSTOM.stringify(payload);

        return sipRequest;

    }

    export function matchSip(sipRequest: sipLibrary.Request): boolean {
        return (
            !!sipRequest.headers && 
            !isNaN(parseInt(sipRequest.headers[actionIdKey]))
        );
    }

    export function readActionId(sipRequest: sipLibrary.Request): number {
        return parseInt(sipRequest.headers[actionIdKey]);
    }

    export function parsePayload(
        sipRequest: sipLibrary.Request,
        sanityCheck?: (payload: any)=> boolean
    ): any{

        let payload = JSON_CUSTOM.parse(sipRequest.content);

        console.assert(!sanityCheck || sanityCheck(payload));

        return payload;

    }

    const methodNameKey = "method";

    export namespace Request {

        let actionIdCounter = 0;

        export function buildSip(
            methodName: string,
            params: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionIdCounter++, params);

            sipRequest.headers[methodNameKey]= methodName;

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sipLibrary.Request
        ): boolean {
            return (
                ApiMessage.matchSip(sipRequest) &&
                !!sipRequest.headers[methodNameKey]
            );
        }

        export function readMethodName(sipRequest: sipLibrary.Request): string {
            return sipRequest.headers[methodNameKey];
        }


    }

    export namespace Response {

        export function buildSip(
            actionId: number,
            response: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionId, response);

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sipLibrary.Request,
            actionId: number
        ): boolean {
            return (
                ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodNameKey] === undefined &&
                ApiMessage.readActionId(sipRequest) === actionId
            );
        }


    }


}


const keepAliveMethodName= "keepAlive";

export class Server {

    constructor(
        public readonly handlers: Server.Handlers,
        public readonly sanityChecks: Server.SanityChecks= {}
    ) {
        this.handlers[keepAliveMethodName]= async ()=> "PONG";
    }

    public startListening(socket: sipLibrary.Socket) {

        socket.evtRequest.attachExtract(
            sipRequest => ApiMessage.Request.matchSip(sipRequest),
            async sipRequest => {

                let methodName = ApiMessage.Request.readMethodName(sipRequest);
                let params: any;

                try {

                    params = ApiMessage.parsePayload(sipRequest, this.sanityChecks[methodName]);

                }catch{
                    console.log("Api request malformed".red);
                    socket.destroy();
                    return;
                }

                //console.log("server", { methodName, params });

                let handler = this.handlers[methodName];

                if (!handler) {
                    console.log(`Method ${methodName} not implemented`.red);
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

                //console.log("server", { response });

                let sipRequestResp = ApiMessage.Response.buildSip(
                    ApiMessage.readActionId(sipRequest),
                    response
                );

                socket.addViaHeader(sipRequestResp);


                socket.write(sipRequestResp);

            }
        );

    }

}

export namespace Server {

    export type Handlers = {
        [methodName: string]: (params: any, fromSocket: sipLibrary.Socket) => Promise<any>
    };

    export type SanityChecks = {
        [methodName: string]: (params: any) => boolean
    };

}

export class Client {

    public static getFromSocket(socket: sipLibrary.Socket): Client {

        let client = socket.misc["apiClient"];

        if (!client) {

            throw new Error("Api client not initialized on this socket");

        }

        return client;

    }

    constructor(
        public readonly socket: sipLibrary.Socket,
        public readonly keepAliveInterval = 120 * 1000,
        public readonly sanityChecks: Client.SanityChecks = {}
    ) {

        socket.misc["apiClient"] = this;

        let timer = setInterval(() => 
            this.sendRequest(keepAliveMethodName, "PING", 5 * 1000).catch(()=>{}),
            keepAliveInterval
        );

        this.socket.evtClose.attach(() => clearInterval(timer));

    }

    public async sendRequest(
        methodName: string,
        params: any,
        timeout = 5 * 60 * 1000
    ): Promise<any> {

        //console.log("client", { methodName, params });

        let sipRequest = ApiMessage.Request.buildSip(methodName, params);

        let actionId = ApiMessage.readActionId(sipRequest);

        this.socket.addViaHeader(sipRequest);

        let writeSuccess = await this.socket.write(sipRequest);

        if (!writeSuccess) {

            throw new Client.SendRequestError(
                methodName,
                params,
                "CANNOT SEND REQUEST"
            );

        }

        let sipRequestResponse: sipLibrary.Request;

        try {

            sipRequestResponse = await Promise.race([
                this.socket.evtRequest.attachOnceExtract(
                    sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
                    timeout,
                    () => { }
                ),
                new Promise<never>(
                    (_, reject) => this.socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE")))
                )
            ]);

        } catch (error) {

            let sendRequestError = new Client.SendRequestError(
                methodName,
                params,
                (error.message === "CLOSE") ?
                    "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT"
            );

            if (sendRequestError.cause === "REQUEST TIMEOUT") {

                console.log("Request timeout".red);
                this.socket.destroy();

            }

            throw sendRequestError;

        }

        let response: any;

        try {

            response = ApiMessage.parsePayload(
                sipRequestResponse,
                this.sanityChecks[methodName]
            );

        } catch {

            let sendRequestError = new Client.SendRequestError(
                methodName,
                params,
                "MALFORMED RESPONSE"
            );

            sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;

            console.log("malformed response".red);
            this.socket.destroy();

            throw sendRequestError;

        }

        //console.log("client", { response });

        return response;

    }

}

export namespace Client {

    export type SanityChecks = {
        [methodName: string]: (response: any) => boolean;
    };

    export class SendRequestError extends Error {

        public readonly misc = {};

        constructor(
            public readonly methodName: string,
            public readonly params: any,
            public readonly cause:
                "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE"
        ) {
            super(`Send request ${methodName} ${cause}`);
            Object.setPrototypeOf(this, new.target.prototype);
        }
    }

}

