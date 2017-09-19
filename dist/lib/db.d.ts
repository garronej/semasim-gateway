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
    type MessageTowardGsmPk = {
        sim_iccid: string;
        creation_timestamp: number;
    };
    function addMessageTowardGsm(to_number: string, text: string, sender: UaInstancePk): Promise<MessageTowardGsmPk>;
    const setMessageToGsmSentId: ({sim_iccid, creation_timestamp}: MessageTowardGsmPk, sent_message_id: number | null) => Promise<void>;
    const getUnsentMessageOfDongleSim: (imei: string) => Promise<{
        pk: MessageTowardGsmPk;
        sender: UaInstancePk;
        to_number: string;
        text: string;
    }[]>;
    const getSenderAndTextOfSentMessageToGsm: (imei: string, sent_message_id: number) => Promise<{
        sender: UaInstancePk;
        text: string;
    } | undefined>;
    const addDongleAndSim: (imei: string, iccid: string) => Promise<void>;
    const addUaInstance: ({dongle_imei, instance_id}: UaInstancePk) => Promise<boolean>;
    const addMessageTowardSip: (from_number: string, text: string, date: Date, target: TargetUaInstances) => Promise<void>;
    const setMessageTowardSipDelivered: ({dongle_imei, instance_id}: UaInstancePk, message_toward_sip_creation_timestamp: number) => Promise<void>;
    const getUndeliveredMessagesOfUaInstance: ({dongle_imei, instance_id}: UaInstancePk) => Promise<{
        creation_timestamp: number;
        from_number: string;
        text: string;
    }[]>;
}
