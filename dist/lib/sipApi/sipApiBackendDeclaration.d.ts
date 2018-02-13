import * as types from "../types";
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
        allowedUas: types.Ua[];
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
    type Params = types.Ua;
    type Response = undefined;
}
export declare namespace wakeUpContact {
    const methodName = "wakeUpContact";
    type Params = {
        contact: types.Contact;
    };
    type Response = "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
}
export declare namespace forceContactToReRegister {
    const methodName = "forceContactToReRegister";
    interface Params {
        contact: types.Contact;
    }
    type Response = boolean;
}
