import * as framework from "../tools/sipApiFramework";
import { Contact } from "./sipContact";
import { getBackendSocket } from "./sipProxy";

import * as _debug from "debug";
let debug = _debug("_sipApiClientBackend");

export namespace claimDongle {

    export const methodName = "claimDongle";

    export interface Params { imei: string; };

    export interface Response { isGranted: boolean; };

    export async function makeCall(
        imei: string,
    ): Promise<boolean> {

        debug(`call ${methodName}`);

        let params: Params = { imei };

        let { isGranted } = await framework.sendRequest(
            await getBackendSocket(),
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
        contactOrContactUri: Contact | string;
    }

    export interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }

    export async function makeCall(
        contactOrContactUri: Contact | string
    ): Promise<Response["status"]> {

        debug(`call ${methodName}`);

        let payload: Params = { contactOrContactUri };

        let { status } = await framework.sendRequest(
            await getBackendSocket(), 
            methodName, 
            payload
        ) as Response;

        debug(`status: ${status}`);

        return status;

    }

}
