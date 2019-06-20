
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
    };

    export type Response={
        status: "OK";
    } | {
        status: "NOT REGISTERED"
    } | {
        status: "REPLACE PASSWORD";
        allowedUas: types.Ua[];
    };
    
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

export namespace notifyNewOrUpdatedUa {

    export const methodName = "notifyNewOrUpdatedUa";

    export type Params= Omit<types.Ua, "towardUserEncryptKeyStr">;

    export type Response= undefined;

}

export namespace wakeUpContact {

    export const methodName = "wakeUpContact";

    export type Params= {
        contact: types.Contact;
    };

    export type Response= 
        "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";

}

export namespace forceContactToReRegister {

    export const methodName = "forceContactToReRegister";

    export interface Params { contact: types.Contact; }

    //** isPushNotificationSent */
    export type Response = boolean;

}