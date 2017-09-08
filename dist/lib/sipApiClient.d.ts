import * as sipLibrary from "../tools/sipLibrary";
import { typesDef } from "chan-dongle-extended-client";
import LockedDongle = typesDef.LockedDongle;
export declare namespace isDongleConnected {
    const methodName = "isDongleConnected";
    interface Params {
        imei: string;
    }
    interface Response {
        isConnected: boolean;
        lastConnectionTimestamp: number;
    }
    function makeCall(gatewaySocket: sipLibrary.Socket, imei: string): Promise<Response>;
}
export declare namespace doesDongleHasSim {
    const methodName = "doesDongleHasSim";
    interface Params {
        imei: string;
        last_four_digits_of_iccid: string;
    }
    interface Response {
        value: boolean | "MAYBE";
    }
    function makeCall(gatewaySocket: sipLibrary.Socket, imei: string, last_four_digits_of_iccid: string): Promise<Response["value"]>;
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
    function makeCall(gatewaySocket: sipLibrary.Socket, params: Params): Promise<Response>;
}
