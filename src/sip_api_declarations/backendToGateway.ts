
import * as types from "../lib/types";
import { types as dcTypes } from "chan-dongle-extended-client";

export namespace notifySimOnline {

    export const methodName= "notifySimOnline";

    /** 
     * replacementPassword is the sip password that will
     * replace the current password if the server respond
     * with status "REPLACE PASSWORD"
     */
    export type Params = {
        imsi: string;
        storageDigest: string;
        password: string;
        replacementPassword: string;
        towardSimEncryptKeyStr: string;
        simDongle: {
            imei: string;
            isVoiceEnabled: boolean | undefined;
            manufacturer: string;
            model: string;
            firmwareVersion: string;
        };
        isGsmConnectivityOk: boolean;
        cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength;
    };

    export type Response={
        status: "OK";
    } | {
        status: "NOT REGISTERED"
    } | {
        status: "REPLACE PASSWORD";
        allowedUas: types.UaRef[];
    };
    
}

export namespace notifyGsmConnectivityChange {

    export const methodName = "notifyGsmConnectivityChange";

    export type Params = {
        imsi: string;
        isGsmConnectivityOk: boolean;
    };

    export type Response= undefined;

}

export namespace notifyCellSignalStrengthChange {

    export const methodName= "notifyCellSignalStrengthChange";

    export type Params = {
        imsi: string;
        cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength;
    };

    export type Response= undefined;

}

export namespace notifyLockedDongle {

    export const methodName= "notifyLockedDongle";

    export type Params = dcTypes.Dongle.Locked;

    export type Response= undefined;

}

export namespace notifyDongleOffline {

    export const methodName= "notifyDongleOffline";

    export type Params ={ imsi: string; } | { imei: string; };

    export type Response= undefined;

}

export namespace notifyOngoingCall {

    export const methodName = "notifyOngoingCall";

    /** Assert we never send this notif when the sim 
     * is not registered. ( ok as the notif is sent only
     * when at least one user joined the call )
    */
    export type Params = { 
        ongoingCallId: string;
        from: "DONGLE" | "SIP";
        imsi: string;
        number: string;
        uasInCall: types.UaRef[]; //NOTE: Only the key of the UA.
        isTerminated: boolean;
    };

    export type Response = undefined;

}

export namespace seeIfSipContactIsReachableElseSendWakeUpPushNotification {

    export const methodName = "seeIfSipContactIsReachableElseSendWakeUpPushNotification";

    export type Params= types.Contact;

    export type Response= { isReachable: boolean; }

}

export namespace sendWakeUpPushNotifications {

    export const methodName= "sendWakeUpPushNotifications";

    export type Params = {
        uas: types.Ua[];
        imsi: string;
    };

    export type Response= undefined;

}




