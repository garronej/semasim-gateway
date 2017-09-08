import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";

namespace ApiMessage {

    const sipMethod = "INTERNAL";
    const actionIdKey= "action-id";
    const methodKey= "method";

    export function buildSip(
        actionId: number,
        payload: Record<string, any>
    ): sip.Request {

        let sipRequest = sip.parse([
            `${sipMethod} _ SIP/2.0`,
            "\r\n"
        ].join("\r\n")) as sip.Request;

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

    export function parsePayload(sipRequest: sip.Request): Record<string, any>{
        return JSON.parse(sipRequest.content);
    }

    export namespace Request {

        let actionIdCounter = 0;

        export function buildSip(
            method: string,
            payload: Record<string, any>,
        ) {

            let sipRequest = ApiMessage.buildSip(actionIdCounter++, payload);

            sipRequest.headers[methodKey]= method;

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request
        ): boolean {

            return (
                ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodKey]
            );

        }

        export function readMethod(sipRequest: sip.Request): string {
            return sipRequest.headers[methodKey];
        }


    }

    export namespace Response {

        export function buildSip(
            actionId: number,
            payload: Record<string, any>,
        ) {

            let sipRequest = ApiMessage.buildSip(actionId, payload);

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request, 
            actionId: number
        ): boolean {

            return (
                ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodKey] === undefined &&
                ApiMessage.readActionId(sipRequest) === actionId
            );

        }


    }


}


export type ApiRequest= {
    method: string;
    params: Record<string, any>;
    sendResponse: (response: Record<string, any>) => void;
}

export function startListening(sipSocket: sip.Socket): SyncEvent<ApiRequest> {

    let evt = new SyncEvent<ApiRequest>();

    sipSocket.evtRequest.attachExtract(
        sipRequest => ApiMessage.Request.matchSip(sipRequest),
        sipRequest => {

            let actionId= ApiMessage.readActionId(sipRequest);

            let method= ApiMessage.Request.readMethod(sipRequest);

            let params= ApiMessage.parsePayload(sipRequest);

            let sendResponse= response => sipSocket.write(
                ApiMessage.Response.buildSip(actionId, response)
            );

            evt.post({ method, params, sendResponse });

        }
    );

    return evt;

}

export async function sendRequest(
    sipSocket: sip.Socket, 
    method: string, 
    params: Record<string, any>
): Promise<Record<string, any>>{

    let sipRequest= ApiMessage.Request.buildSip(method, params);

    let actionId= ApiMessage.readActionId(sipRequest);

    sipSocket.write(sipRequest);

    let sipRequestResponse= await sipSocket.evtRequest.waitForExtract( 
        sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
    );

    return ApiMessage.parsePayload(sipRequestResponse);

}