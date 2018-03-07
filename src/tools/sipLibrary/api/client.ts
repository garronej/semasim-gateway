import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";

export async function sendRequest<Params, Response>(
    socket: Socket,
    methodName: string,
    params: Params,
    extra: {
        timeout?: number;
        sanityCheck?: (response: Response) => boolean;
    } = {}
): Promise<Response> {

    let sipRequest = ApiMessage.Request.buildSip(methodName, params);

    misc.buildNextHopPacket.pushVia(socket, sipRequest);

    let actionId = ApiMessage.readActionId(sipRequest);

    let writeSuccess = await socket.write(sipRequest);

    if (!writeSuccess) {

        throw new SendRequestError(
            methodName,
            params,
            "CANNOT SEND REQUEST"
        );

    }

    let sipRequestResponse: types.Request;

    try {

        sipRequestResponse = await Promise.race([
            socket.evtRequest.attachOnceExtract(
                sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
                extra.timeout || 5 * 60 * 1000,
                () => { }
            ),
            new Promise<never>(
                (_, reject) => socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE")))
            )
        ]);

    } catch (error) {

        let sendRequestError = new SendRequestError(
            methodName,
            params,
            (error.message === "CLOSE") ?
                "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT"
        );

        if (sendRequestError.cause === "REQUEST TIMEOUT") {

            console.log("Request timeout".red);
            socket.destroy();

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

        let sendRequestError = new SendRequestError(
            methodName,
            params,
            "MALFORMED RESPONSE"
        );

        sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;

        console.log("malformed response".red);
        socket.destroy();

        throw sendRequestError;

    }

    return response;

}

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

export function enableKeepAlive(
    socket: Socket,
    interval = 120 * 1000
): void {

    const methodName = keepAlive.methodName;
    type Params = keepAlive.Params;
    type Response = keepAlive.Response;

    (async () => {

        if (!socket.evtConnect.postCount) {

            await socket.evtConnect.waitFor();

        }

        while (true) {

            try {

                await sendRequest<Params, Response>(
                    socket,
                    methodName,
                    "PING",
                    {
                        "timeout": 5 * 1000,
                        "sanityCheck": response => response === "PONG"
                    }
                );

            } catch{

                break;

            }

            try {

                await socket.evtClose.waitFor(interval);

                break;

            } catch{ }

        }

    })();

}