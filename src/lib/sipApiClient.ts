import * as framework from "../tools/sipApiFramework";
import * as sipLibrary from "../tools/sipLibrary";
import { typesDef } from "chan-dongle-extended-client";
import LockedDongle = typesDef.LockedDongle;

import * as _debug from "debug";
let debug = _debug("_sipApiClient");

export namespace isDongleConnected {

    export const methodName = "isDongleConnected";

    export interface Params {
        imei: string;
    }

    export interface Response {
        isConnected: boolean;
        lastConnectionTimestamp: number;
    }

    export async function makeCall(
        gatewaySocket: sipLibrary.Socket,
        imei: string
    ): Promise<Response> {

        debug(`call ${methodName}`);

        let params: Params = { imei };

        let response = await framework.sendRequest(
            gatewaySocket,
            methodName,
            params
        ) as Response;

        return response;

    }

}

export namespace doesDongleHasSim {

    export const methodName = "doesDongleHasSim";

    export interface Params {
        imei: string;
        last_four_digits_of_iccid: string;
    }

    export interface Response {
        value: boolean | "MAYBE";
    }


    export async function makeCall(
        gatewaySocket: sipLibrary.Socket,
        imei: string,
        last_four_digits_of_iccid: string
    ): Promise<Response["value"]> {

        debug(`call ${methodName}`);

        let params: Params = { imei, last_four_digits_of_iccid };

        let { value } = await framework.sendRequest(
            gatewaySocket,
            methodName,
            params
        ) as Response;

        return value;

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
            dongleFound: true;
            pinState: LockedDongle["pinState"];
            tryLeft: number;
        } | {
            dongleFound: false;
        } | {
            dongleFound: true;
            pinState: "READY";
            iccid: string;
            number: string | undefined;
            serviceProvider: string | undefined;
        };

    export async function makeCall(
        gatewaySocket: sipLibrary.Socket,
        params: Params
    ): Promise<Response> {

        debug(`call ${methodName}`);

        let response = await framework.sendRequest(
            gatewaySocket,
            methodName,
            params
        ) as Response;

        debug("Response: ", { response });

        return response;

    }

}