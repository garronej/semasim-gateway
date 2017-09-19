import { Contact } from "./sipContact";
export declare namespace asterisk {
    function queryEndpoints(): Promise<string[]>;
    function truncateContacts(): Promise<void>;
    function queryContacts(): Promise<Contact[]>;
    function queryLastConnectionTimestampOfDonglesEndpoint(endpoint: string): Promise<number>;
    function deleteContact(contact: Contact): Promise<boolean>;
    function addOrUpdateEndpoint(endpoint: string, password: string): Promise<void>;
}
export declare namespace semasim {
    type UaInstancePk = {
        dongle_imei: string;
        instance_id: string;
    };
    type TargetUaInstances = {
        allUaInstanceOfImei?: string;
        uaInstance?: UaInstancePk;
        allUaInstanceOfEndpointOtherThan?: UaInstancePk;
    };
    type MessageTowardGsm = {
        id: number;
        sim_iccid: string;
        date: Date;
        sender: UaInstancePk;
        to_number: string;
        text: string;
    };
    type MessageTowardSip = {
        id: number;
        date: Date;
        from_number: string;
        text: string;
    };
    const addMessageTowardGsm: (to_number: string, text: string, sender: UaInstancePk) => Promise<number>;
    const setMessageToGsmSentId: (message_toward_gsm_id: number, sent_message_id: number) => Promise<void>;
    const getUnsentMessageOfDongleSim: (imei: string) => Promise<MessageTowardGsm[]>;
    const getSenderAndTextOfSentMessageToGsm: (imei: string, sent_message_id: number) => Promise<{
        sender: UaInstancePk;
        text: string;
    } | undefined>;
    const addDongleAndSim: (imei: string, iccid: string) => Promise<void>;
    const addUaInstance: (uaInstancePk: UaInstancePk) => Promise<boolean>;
    const addMessageTowardSip: (from_number: string, text: string, date: Date, target: TargetUaInstances) => Promise<number>;
    const setMessageTowardSipDelivered: (uaInstancePk: UaInstancePk, message_toward_sip_id: number) => Promise<void>;
    const getUndeliveredMessagesOfUaInstance: (uaInstancePk: UaInstancePk) => Promise<MessageTowardSip[]>;
}
