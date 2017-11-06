import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";
import * as superJson from "super-json";

namespace JSON {
    const myJson = superJson.create({
        "magic": '#!',
        "serializers": [
            superJson.dateSerializer,
        ]
    });

    export function stringify(obj: any): string {

        if (obj === undefined) {
            return "undefined";
        }

        return myJson.stringify([obj]);

    }

    export function parse(str: string): any {

        if (str === "undefined") {
            return undefined;
        }

        return myJson.parse(str).pop();
    }

}

namespace ApiMessage {

    const sipMethod = "API";
    const actionIdKey= "action-id";
    const methodKey= "method";

    export function buildSip(
        actionId: number,
        payload: any
    ): sip.Request {

        let sipRequest = sip.parse([
            `${sipMethod} _ SIP/2.0`,
            "Max-Forwards: 1",
            "\r\n"
        ].join("\r\n")) as sip.Request;

        //TODO: should be set to [] already :(
        sipRequest.headers.via= [];

        sipRequest.headers[actionIdKey] = `${actionId++}`;

        sipRequest.content = JSON.stringify(payload);

        return sipRequest;

    }

    export function matchSip(sipRequest: sip.Request): boolean {
        return sipRequest.method === sipMethod;
    }

    export function readActionId(sipRequest: sip.Request): number {
        return parseInt(sipRequest.headers[actionIdKey]);
    }

    export function parsePayload(sipRequest: sip.Request): any{

        return JSON.parse(sipRequest.content);

    }

    export namespace Request {

        let actionIdCounter = 0;

        export function buildSip(
            method: string,
            payload: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionIdCounter++, payload);

            sipRequest.headers[methodKey]= method;

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request
        ): boolean {

            try {

                return (
                    ApiMessage.matchSip(sipRequest) &&
                    sipRequest.headers[methodKey]
                );

            } catch{

                return false;

            }


        }

        export function readMethod(sipRequest: sip.Request): string {
            return sipRequest.headers[methodKey];
        }


    }

    export namespace Response {

        export function buildSip(
            actionId: number,
            payload: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionId, payload);

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request,
            actionId: number
        ): boolean {

            try {

                return (
                    ApiMessage.matchSip(sipRequest) &&
                    sipRequest.headers[methodKey] === undefined &&
                    ApiMessage.readActionId(sipRequest) === actionId
                );

            } catch{

                return false;

            }

        }


    }


}


export type ApiRequest = {
    method: string;
    params: any;
    sendResponse: (response: any) => void;
}

export function startListening(sipSocket: sip.Socket): SyncEvent<ApiRequest> {

    let evt = new SyncEvent<ApiRequest>();

    sipSocket.evtRequest.attachExtract(
        sipRequest => ApiMessage.Request.matchSip(sipRequest),
        sipRequest => {

            let actionId: number;
            let method: string;
            let params: any;

            try {

                actionId = ApiMessage.readActionId(sipRequest);

                method = ApiMessage.Request.readMethod(sipRequest);

                params = ApiMessage.parsePayload(sipRequest);

                if (typeof actionId !== "number" || isNaN(actionId)) {
                    throw Error();
                }

                if (typeof method !== "string") {
                    throw Error();
                }

            } catch{
                console.log(`Remote api bad message`);
                return;
            }

            let sendResponse = response => {

                let sipRequest = ApiMessage.Response.buildSip(actionId, response);

                //TODO: test!
                sipSocket.addViaHeader(sipRequest);

                sipSocket.write(sipRequest);

            };

            evt.post({ method, params, sendResponse });

        }
    );

    return evt;

}

export const errorSendRequest = {
    "timeout": "Timeout, No response in allowed delay",
    "writeFailed": "Can't send request, write error",
    "sockedCloseBeforeResponse": "Socket has been closed before receiving response",
    "malformedResponse": "Body response could not be parsed"
}

export async function sendRequest(
    sipSocket: sip.Socket,
    method: string,
    params: any,
    timeout: number = 5 * 60 * 1000
): Promise<any> {

    let sipRequest = ApiMessage.Request.buildSip(method, params);

    let actionId = ApiMessage.readActionId(sipRequest);

    sipSocket.addViaHeader(sipRequest);

    let success = sipSocket.write(sipRequest);

    if (!success) throw new Error(errorSendRequest.writeFailed);

    let sipRequestResponse: sip.Request;

    try {

        sipRequestResponse = await Promise.race([
            sipSocket.evtRequest.attachOnceExtract(
                sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
                timeout,
                () => { }
            ),
            new Promise<never>((_, reject) => sipSocket.evtClose.attachOnce(sipRequest, reject))
        ]);

    } catch (error) {

        if (typeof error === "boolean") {
            throw new Error(errorSendRequest.sockedCloseBeforeResponse);
        } else {
            throw new Error(errorSendRequest.timeout);
        }

    }

    try{

        return ApiMessage.parsePayload(sipRequestResponse);

    }catch{

        throw new Error(errorSendRequest.malformedResponse);

    }

}