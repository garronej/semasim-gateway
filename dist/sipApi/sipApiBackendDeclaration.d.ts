import { Contact } from "../lib/sipContact";
export declare namespace notifySimOnline {
    const methodName = "notifySimOnline";
    type Params = {
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
    type Response = {
        status: "OK";
    } | {
        status: "NOT REGISTERED";
    } | {
        status: "NEED PASSWORD RENEWAL";
        allowedUas: Contact.UaSim.Ua[];
    };
}
export declare namespace notifySimOffline {
    const methodName = "notifySimOffline";
    type Params = {
        imsi: string;
    };
    type Response = undefined;
}
export declare namespace notifyNewOrUpdatedUa {
    const methodName = "notifyNewOrUpdatedUa";
    type Params = Contact.UaSim.Ua;
    type Response = undefined;
}
export declare namespace wakeUpContact {
    const methodName = "wakeUpContact";
    type Params = {
        contact: Contact;
    };
    type Response = "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
}
export declare namespace forceContactToReRegister {
    const methodName = "forceContactToReRegister";
    interface Params {
        contact: Contact;
    }
    type Response = boolean;
}
