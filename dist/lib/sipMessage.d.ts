import { SyncEvent } from "ts-events-extended";
import * as types from "./types";
export declare const evtMessage: SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date | undefined;
}>;
export declare const sipMessageContext = "from-sip-message";
export declare function startHandling(): Promise<void>;
export declare function sendMessage(contact: types.Contact, fromNumber: string, headers: Record<string, string>, text: string, fromNumberSimName?: string): Promise<void>;
