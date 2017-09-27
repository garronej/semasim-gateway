import { Contact } from "./sipContact";
export declare namespace claimDongle {
    const methodName = "claimDongle";
    interface Params {
        imei: string;
    }
    interface Response {
        isGranted: boolean;
    }
    function makeCall(imei: string): Promise<boolean>;
}
export declare namespace wakeUpUserAgent {
    const methodName = "wakeUpUserAgent";
    interface Params {
        contact: Contact;
    }
    interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }
    function makeCall(contact: Contact): Promise<Response["status"]>;
}
export declare namespace forceReRegister {
    const methodName = "forceReRegister";
    interface Params {
        contact: Contact;
    }
    interface Response {
        isPushNotificationSent: boolean;
    }
    function makeCall(contact: Contact): Promise<Response["isPushNotificationSent"]>;
}
