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
        contactOrContactUri: Contact | string;
    }
    interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }
    function makeCall(contactOrContactUri: Contact | string): Promise<Response["status"]>;
}
