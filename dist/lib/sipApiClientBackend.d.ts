import { Contact } from "./sipContact";
export declare namespace evtSimOnline {
    const name = "evtSimOnline";
    interface Data {
        imsi: string;
        isVoiceEnabled: boolean | undefined;
    }
    function post(data: Data): Promise<void>;
}
export declare namespace evtSimOffline {
    const name = "evtSimOffline";
    interface Data {
        imsi: string;
    }
    function post(data: Data): Promise<void>;
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
export declare namespace forceContactToReRegister {
    const methodName = "forceContactToReRegister";
    interface Params {
        contact: Contact;
    }
    interface Response {
        isPushNotificationSent: boolean;
    }
    function makeCall(contact: Contact): Promise<Response["isPushNotificationSent"]>;
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
