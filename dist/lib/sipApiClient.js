"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var framework = require("../tools/sipApiFramework");
var _debug = require("debug");
var debug = _debug("_sipApiClient");
var sendRequest = function (sipSocket, method, params, timeout) {
    debug(method + ": params: " + JSON.stringify(params) + "...");
    var response = framework.sendRequest(sipSocket, method, params, timeout || 5000);
    debug("..." + method + ": response: " + JSON.stringify(response));
    return response;
};
/*
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
*/
