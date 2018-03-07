import * as types from "../../../types";

export namespace notifySimOnline {

    export const methodName= "notifySimOnline";

    export type Params = {
        imsi: string;
        storageDigest: string;
        password: string;
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
        status: "NEED PASSWORD RENEWAL";
        allowedUas: types.Ua[];
    };
    
}

export namespace notifySimOffline {

    export const methodName= "notifySimOffline";

    export type Params ={ imsi: string; };

    export type Response= undefined;

}

export namespace notifyNewOrUpdatedUa {

    export const methodName = "notifyNewOrUpdatedUa";

    export type Params= types.Ua;

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
