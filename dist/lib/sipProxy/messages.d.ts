import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "../types";
export declare const dialplanContext = "from-sip-message";
export declare const evtMessage: SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date | undefined;
}>;
export declare function sendMessage(contact: types.Contact, fromNumber: string, headers: Record<string, string>, text: string, fromNumberSimName?: string): Promise<void>;
export declare namespace sendMessage {
    const evtOutgoingMessage: SyncEvent<{
        sipRequest: sipLibrary.Request;
        prSipResponse: Promise<void>;
    }>;
}
/**
 * Must be called before the first connection to backend
 * and after DongleController have been instantiated
 *
 * not exported
 *
 * */
export declare function init(): Promise<void>;
export declare function onNewAsteriskSocket(asteriskSocket: sipLibrary.Socket, prContact: Promise<types.Contact>): void;
