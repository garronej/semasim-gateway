import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
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
export declare namespace _protected {
    /**
     * Must be called before the first connection to backend
     * and after DongleController have been instantiated
     * */
    function initDialplan(): Promise<void>;
    /**
     * Need to be call by sipRouter when a SIP MESSAGE packet is emitted by asterisk.
     *
     * @param sipRequestNextHop must be the packet that will be sent to the gateway to the backend.
     * This calling this method will cause the message to be updated.
     * @param prSipResponse promise that resolve if a response is received from UA or reject
     * if no response have been received in a reasonable amount of time.
     *
     */
    function onOutgoingSipMessage(sipRequestNextHop: sipLibrary.Request, prSipResponse: Promise<any>): void;
    /**
     *
     * Must be called by sipRouter when we received from backend an SIP MESSAGE.
     * The sip message must have been accepted by asterisk and the content type
     * must be text/plain
     *
     * @param fromContact the contact the message come from
     * @param sipRequestReceived the sipRequest as received from the backend,
     * the message will not be modified.
     *
     */
    function onIncomingSipMessage(fromContact: types.Contact, sipRequestReceived: sipLibrary.Request): void;
}
