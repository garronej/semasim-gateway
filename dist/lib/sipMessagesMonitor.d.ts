import * as sipLibrary from "ts-sip";
import * as types from "./types";
export declare const dialplanContext = "from-sip-message";
export declare const evtMessage: import("evt/dist/lib/types").Evt<{
    fromContact: types.Contact;
    toNumber: string;
    bundledData: types.BundledData.ClientToServer.Message;
}>;
export declare function sendMessage(contact: types.Contact, fromNumber: string, headers: Record<string, string>): Promise<void>;
export declare namespace sendMessage {
    const evtOutgoingMessage: import("evt/dist/lib/types").Evt<{
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
