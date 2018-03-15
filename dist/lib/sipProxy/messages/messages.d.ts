import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../../../tools/sipLibrary";
import * as types from "./../../types";
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
 * */
export declare function initDialplan(): Promise<void>;
/**
 * Need to be call by sipRouter when a SIP MESSAGE packet is emitted by asterisk.
 *
 * @param sipRequestAsReceived Must be the sipRequest as sent by asterisk.
 * This calling this method will cause the message to be updated.
 * Even if the received packet should never be altered by the sipProxy
 * it is ok in this case as this module act as a middleware between Asterisk and
 * the semasim gateway.
 * @param prSipResponse promise that resolve if a response is received from UA or reject
 * if no response have been received in a reasonable amount of time.
 *
 */
export declare function onOutgoingSipMessage(sipRequestAsReceived: sipLibrary.Request, prSipResponse: Promise<any>): void;
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
export declare function onIncomingSipMessage(fromContact: types.Contact, sipRequestReceived: sipLibrary.Request): void;
