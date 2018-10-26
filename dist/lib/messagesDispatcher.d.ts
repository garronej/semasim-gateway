import * as AsyncLock from "async-lock";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types from "./types";
export declare function sendMessagesOfDongle(dongle: dcTypes.Dongle.Usable): void;
export declare namespace sendMessagesOfDongle {
    const lock: AsyncLock;
}
export declare function notifyNewSipMessagesToSend(imsi: string): Promise<void>;
/** Assert contact reachable  */
export declare function sendMessagesOfContact(contact: types.Contact): void;
export declare namespace sendMessagesOfContact {
    const lock: AsyncLock;
}
