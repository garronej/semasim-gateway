import * as sipLibrary from "../tools/sipLibrary";
import { DongleController as Dc } from "chan-dongle-extended-client";
export declare namespace isDongleConnected {
    const methodName = "isDongleConnected";
    interface Params {
        imei: string;
    }
    type Response = {
        isConnected: true;
    } | {
        isConnected: false;
        lastConnection: Date;
    };
    function makeCall(gatewaySocket: sipLibrary.Socket, imei: string): Promise<Response>;
}
export declare namespace unlockDongle {
    const methodName = "unlockDongle";
    interface Params {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    }
    type Response = {
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
    function makeCall(gatewaySocket: sipLibrary.Socket, params: Params): Promise<Response>;
}
