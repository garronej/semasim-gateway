import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "ts-sip";
import * as types from "./types";
export declare const dialplanContext = "from-sip-message";
export declare const evtMessage: SyncEvent<{
    fromContact: types.Contact;
    toNumber: string;
    text: string;
    exactSendDate: Date;
    appendPromotionalMessage: boolean;
}>;
export declare function sendMessage(contact: types.Contact, fromNumber: string, headers: Record<string, string>): Promise<void>;
export declare namespace sendMessage {
    const evtOutgoingMessage: SyncEvent<{
        sipRequest: sipLibrary.Request;
        prSipResponse: Promise<void>;
    }>;
}
/**
 * Must be called before the first connection to backend
 * and after Ami have been instantiated.
 * */
export declare function init(): Promise<void>;
/**
 * Should be called against every new asterisk socket
 * as soon as it is created.
 * prContact should resolve to the sipContact
 * associated to the socket.
 *  */
export declare function handleAsteriskSocket(asteriskSocket: sipLibrary.Socket, prContact: Promise<types.Contact>): void;
