import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";

export class Client {

    public static getFromSocket(socket: Socket): Client {

        let client = socket.misc["__apiClient__"];

        if (!client) {

            throw new Error("Api client not initialized on this socket");

        }

        return client;

    }

    /** Must be called once the socket has connected */
    constructor(
        public readonly socket: Socket,
        public readonly keepAliveInterval = 120 * 1000
    ) {

        socket.misc["__apiClient__"] = this;

        (() => {

            const methodName = keepAlive.methodName;
            type Params = keepAlive.Params;
            type Response = keepAlive.Response;

            const timeout = keepAlive.timeout;
            const sanityCheck = keepAlive.Response.sanityCheck;

            //TODO await connect before send

            let timer = setInterval(() =>
                this.sendRequest<Params, Response>(
                    methodName,
                    "PING",
                    { timeout, sanityCheck }
                ),
                keepAliveInterval
            );

            this.socket.evtClose.attachOnce(() => clearInterval(timer));

        })();


    }

    public async sendRequest<Params, Response>(
        methodName: string,
        params: Params,
        extra: {
            timeout?: number;
            sanityCheck?: (response: Response) => boolean;
        } = {}
    ): Promise<Response> {

        let sipRequest = ApiMessage.Request.buildSip(methodName, params);

        misc.buildNextHopPacket.pushVia(this.socket, sipRequest);

        let actionId = ApiMessage.readActionId(sipRequest);

        let writeSuccess = await this.socket.write(sipRequest);

        if (!writeSuccess) {

            throw new Client.SendRequestError(
                methodName,
                params,
                "CANNOT SEND REQUEST"
            );

        }

        let sipRequestResponse: types.Request;

        try {

            sipRequestResponse = await Promise.race([
                this.socket.evtRequest.attachOnceExtract(
                    sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
                    extra.timeout || 5 * 60 * 1000,
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
                extra.sanityCheck
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

        return response;

    }

}

export namespace Client {

    export class SendRequestError extends Error {

        public readonly misc = {};

        constructor(
            public readonly methodName: string,
            public readonly params: any,
            public readonly cause:
                "CANNOT SEND REQUEST" |
                "SOCKET CLOSED BEFORE RECEIVING RESPONSE" |
                "REQUEST TIMEOUT" |
                "MALFORMED RESPONSE"
        ) {
            super(`Send request ${methodName} ${cause}`);
            Object.setPrototypeOf(this, new.target.prototype);
        }
    }

}
