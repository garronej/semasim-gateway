import { SyncEvent } from "ts-events-extended";
import { Contact } from "./sipContact";
export declare namespace asterisk {
    function getEvtNewContact(): SyncEvent<Contact>;
    function getEvtExpiredContact(): SyncEvent<Contact>;
    function queryEndpoints(): Promise<string[]>;
    function queryContacts(): Promise<Contact[]>;
    function queryLastConnectionTimestampOfDonglesEndpoint(endpoint: string): Promise<number>;
    function deleteContact(contact: Contact): Promise<boolean>;
    function addOrUpdateEndpoint(endpoint: string, password: string): Promise<void>;
}
export declare namespace semasim {
    type TargetUaInstances = {
        allUaInstanceOfImei?: string;
        uaInstance?: Contact['uaInstance'];
        allUaInstanceOfEndpointOtherThan?: Contact['uaInstance'];
    };
    type MessageTowardGsm = {
        id: number;
        sim_iccid: string;
        date: Date;
        sender: Contact['uaInstance'];
        to_number: string;
        text: string;
    };
    type MessageTowardSip = {
        id: number;
        date: Date;
        from_number: string;
        text: string;
    };
    const addMessageTowardGsm: (to_number: string, text: string, sender: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    }) => Promise<number>;
    const setMessageToGsmSentId: (message_toward_gsm_id: number, sent_message_id: number) => Promise<void>;
    const getUnsentMessageOfDongleSim: (imei: string) => Promise<MessageTowardGsm[]>;
    const getSenderAndTextOfSentMessageToGsm: (imei: string, sent_message_id: number) => Promise<{
        sender: {
            readonly dongle_imei: string;
            readonly instance_id: string;
        };
        text: string;
    } | undefined>;
    const addDongleAndSim: (imei: string, iccid: string) => Promise<void>;
    const addUaInstance: (uaInstance: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    }) => Promise<boolean>;
    const addMessageTowardSip: (from_number: string, text: string, date: Date, target: TargetUaInstances) => Promise<number>;
    const setMessageTowardSipDelivered: (uaInstance: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    }, message_toward_sip_id: number) => Promise<void>;
    const getUndeliveredMessagesOfUaInstance: (uaInstance: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    }) => Promise<MessageTowardSip[]>;
}
