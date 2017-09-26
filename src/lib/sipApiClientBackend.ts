import * as framework from "../tools/sipApiFramework";
import { Contact } from "./sipContact";
import { getBackendSocket } from "./sipProxy";

import * as _debug from "debug";
let debug = _debug("_sipApiClientBackend");


async function sendRequest(
    method: string, 
    params: Record<string, any>
): Promise<Record<string, any>> {

    let backendSocket = await getBackendSocket();

    try{ 
        
        return await framework.sendRequest(
            backendSocket,
            method,
            params
        );

    }catch(error){

        debug("Connection lost with backend retrying...");

        return sendRequest(method, params);

    }

}


export namespace claimDongle {

    export const methodName = "claimDongle";

    export interface Params { imei: string; };

    export interface Response { isGranted: boolean; };

    export async function makeCall(
        imei: string,
    ): Promise<boolean> {

        debug(`call ${methodName}`);

        let params: Params = { imei };

        let { isGranted } = await sendRequest(
            methodName,
            params
        ) as Response;

        debug(`isGranted: ${isGranted}`);

        return isGranted;

    }

}

export namespace wakeUpUserAgent {

    export const methodName = "wakeUpUserAgent";

    export interface Params {
        contact: Contact;
    }

    export interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }

    export async function makeCall(
        contact: Contact
    ): Promise<Response["status"]> {

        debug(`call ${methodName}`);

        let payload: Params = { contact };

        let { status } = await sendRequest(
            methodName, 
            payload
        ) as Response;

        debug(`status: ${status}`);

        return status;

    }

}
