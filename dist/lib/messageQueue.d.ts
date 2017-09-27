import { Contact } from "./sipContact";
export declare function sendDonglePendingMessages(imei: string): void;
export declare function sendPendingSipMessagesToReachableContact(contact: Contact): void;
export declare function notifyNewSipMessagesToSend(): void;
