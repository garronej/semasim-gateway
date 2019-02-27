import * as sqliteCustom from "sqlite-custom";
import * as types from "./types";
import { types as dcTypes } from "chan-dongle-extended-client";
export declare let _: sqliteCustom.Api;
export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
/** Must be called and awaited before use */
export declare function launch(): Promise<void>;
/** Only for test purpose */
export declare function flush(): Promise<void>;
export declare function addUaSim(uaSim: types.UaSim): Promise<{
    isUaCreatedOrUpdated: boolean;
    isFirstUaForSim: boolean;
}>;
export declare function removeUaSim(imsi: string, uasToKeep?: types.Ua[]): Promise<void>;
/**
 *
 * to call when sip message received.
 *
 * @param toNumber phone number to send to
 * @param text
 * @param uaSim uaSim that emitted the message
 * @param date this is the exactSendDate that was bundled
 * by the client app in the SIP MESSAGE header, it is used as an id
 * so that the client find to witch message correspond the
 * sendReport and statusReport.
 *
 * NOTE: no new sip message added to the queue.
 * Queue a new messageTowardGsm
 *
 */
export declare function onSipMessage(toNumber: string, text: string, uaSim: types.UaSim, date: Date, appendPromotionalMessage: boolean): Promise<void>;
/**
 * to call when a SMS is received by a dongle
 *
 * Return true if there is an ua registered to this SIM.
 * If not the message is not stored in DB.
 *
 * @param fromNumber
 * txt       => number of who sent the SMS
 *
 * @param text
 * txt       => SMS
 *
 * @param date
 * txt       => date the SMS have been sent read from PDU
 *
 * */
export declare function onDongleMessage(fromNumber: string, text: string, date: Date, imsi: string): Promise<boolean>;
/**
 * to call when when a call have been missed
 *
 * will create the message toward sip to notify UAs about it.
 *
 * */
export declare function onMissedCall(imsi: string, number: string): Promise<void>;
/**
 *
 * to call when a call have been answered,
 *
 * will inform ua of other users that the call have been taken.
 *
*/
export declare function onCallAnswered(number: string, imsi: any, answeredByUa: types.Ua, ringingUas: Iterable<types.Ua>): Promise<void>;
/** Check if a ua registration have message pending */
export declare function messageTowardSipUnsentCount(uaSim: types.UaSim): Promise<number>;
/** Return array of tuples [ MessageTowardSip, <method to set the message as received> ] */
export declare function getUnsentMessagesTowardSip(uaSim: types.UaSim): Promise<[types.MessageTowardSip, () => Promise<void>][]>;
/**
 *
 * Provide the SMS that need to be send via Dongle.
 *
 * return an array of tuple [ MessageTowardGsm, <method to set the send date and status report> ]
 *
 * */
export declare function getUnsentMessagesTowardGsm(imsi: string): Promise<[types.MessageTowardGsm, getUnsentMessagesTowardGsm.Confirm][]>;
export declare namespace getUnsentMessagesTowardGsm {
    type Confirm = {
        onSent(sendDate: Date | null): Promise<void>;
        onStatusReport(statusReport: dcTypes.StatusReport): Promise<void>;
    };
    /**
     *
     * Set message toward sip as received in the db and create Send report
     *
     * sendDate correspond to the exact time the message have been sent by dongle,
     * null if send failed.
     *
    */
    function onSent(messageTowardGsm_id: number, messageTowardGsm: types.MessageTowardGsm, sendDate: Date | null): Promise<void>;
    function onStatusReport(messageTowardGsm_id: number, messageTowardGsm: types.MessageTowardGsm, statusReport: dcTypes.StatusReport): Promise<void>;
}
/**
 *
 * Only used to recover after being down to know from when
 * we have to pull the SMS of chan-dongle-extended
 *
 */
export declare function lastMessageReceivedDateBySim(): Promise<{
    [imsi: string]: Date;
}>;
/**
 *
 * TODO: include in tests
 *
 * Notify specific ua that the phone it's trying to reach is ringing.
 *
 * @param uaSim The uaSim that originated the call.
 * @param number The target phone number.
 *
 * (For now it only send to web ua)
 *
 *
 */
export declare function onTargetGsmRinging(contact: types.Contact, number: string, callId: string): Promise<void>;
