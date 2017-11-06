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

    try {

        debug(`${method}: params: ${JSON.stringify(params).substring(0, 20)}...`);

        let response = await framework.sendRequest(
            backendSocket,
            method,
            params
        );

        debug(`...${method}: response: ${JSON.stringify(response)}`);

        return response;

    } catch (error) {

        debug(`Error sending request: ${error.message}, retrying...`);

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

        let params: Params = { imei };

        let { isGranted } = await sendRequest(
            methodName,
            params
        ) as Response;

        return isGranted;

    }

}

export namespace wakeUpContact {

    export const methodName = "wakeUpContact";

    export interface Params {
        contact: Contact;
    }

    export interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }

    export async function makeCall(
        contact: Contact
    ): Promise<Response["status"]> {

        let payload: Params = { contact };

        let { status } = await sendRequest(
            methodName,
            payload
        ) as Response;

        return status;

    }

}

//Here we can send only push infos.
export namespace sendPushNotification {

    export const methodName= "sendPushNotification";

    export interface Params {
        ua: Contact.UaEndpoint.Ua;
    }

    export interface Response {
        isPushNotificationSent: boolean;
    }

    export async function makeCall(
        ua: Contact.UaEndpoint.Ua
    ): Promise<boolean> {

        let payload: Params = { ua };

        let { isPushNotificationSent } = await sendRequest(
            methodName,
            payload
        ) as Response;

        return isPushNotificationSent;

    }

}
