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
export declare namespace wakeUpContact {
    const methodName = "wakeUpContact";
    interface Params {
        contact: Contact;
    }
    interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }
    function makeCall(contact: Contact): Promise<Response["status"]>;
}
export declare namespace sendPushNotification {
    const methodName = "sendPushNotification";
    interface Params {
        ua: Contact.UaEndpoint.Ua;
    }
    interface Response {
        isPushNotificationSent: boolean;
    }
    function makeCall(ua: Contact.UaEndpoint.Ua): Promise<boolean>;
}
