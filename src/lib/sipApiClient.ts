import * as framework from "../tools/sipApiFramework";
import * as sipLibrary from "../tools/sipLibrary";
import { DongleController as Dc } from "chan-dongle-extended-client";

import * as _debug from "debug";
let debug = _debug("_sipApiClient");


const sendRequest: typeof framework.sendRequest= 
(sipSocket, method, params, timeout)=>{

    debug(`${method}: params: ${JSON.stringify(params)}...`);

    let response= framework.sendRequest(sipSocket, method, params, timeout || 5000);

    debug(`...${method}: response: ${JSON.stringify(response)}`);

    return response;

}

export namespace isDongleConnected {

    export const methodName = "isDongleConnected";

    export interface Params {
        imei: string;
    }

    export type Response = 
    {
        isConnected: true;
    } | {
        isConnected: false;
        lastConnection: Date;
    };

    export async function makeCall(
        gatewaySocket: sipLibrary.Socket,
        imei: string
    ): Promise<Response> {

        let params: Params = { imei };

        let response = await sendRequest(
            gatewaySocket,
            methodName,
            params,
            4000
        ) as Response;

        return response;

    }

}

export namespace unlockDongle {

    export const methodName = "unlockDongle";

    export interface Params {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    }

    export type Response =
        {
            status: "STILL LOCKED";
            pinState: Dc.LockedDongle["sim"]["pinState"];
            tryLeft: number;
        } | {
            status: "ERROR";
            message: string;
        } | {
            status: "SUCCESS";
            dongle: Dc.ActiveDongle;
        };

    export async function makeCall(
        gatewaySocket: sipLibrary.Socket,
        params: Params
    ): Promise<Response> {

        let response = await sendRequest(
            gatewaySocket,
            methodName,
            params,
            120000
        ) as Response;

        return response;

    }

}
