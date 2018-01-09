import { Contact } from "../lib/sipContact";


export namespace notifySimOnline {

    export const methodName= "notifiySimOnline";

    export type Params = {
        imsi: string;
        isVoiceEnabled: boolean | undefined;
        storageDigest: string;
        password: string;
    };

    export type Response={
        status: "OK";
    } | {
        status: "NOT REGISTERED"
    } | {
        status: "NEED PASSWORD RENEWAL";
        allowedUas: Contact.UaSim.Ua[];
    };
    
}

export namespace notifySimOffline {

    export const methodName= "notifySimOffline";

    export type Params ={ imsi: string; };

    export type Response= undefined;

}

export namespace notifyNewOrUpdatedUa {

    export const methodName = "notifyNewOrUpdatedUa";

    export type Params= Contact.UaSim.Ua;

    export type Response= undefined;

}

export namespace wakeUpContact {

    export const methodName = "wakeUpContact";

    export type Params= {
        contact: Contact;
    };

    export type Response= 
        "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";

}

export namespace forceContactToReRegister {

    export const methodName = "forceContactToReRegister";

    export interface Params { contact: Contact; }

    //** isPushNotificationSent */
    export type Response = boolean;

}
