import { SyncEvent } from "ts-events-extended";
export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace PsContact {
    function buildUserAgentFieldValue(instanceId: string, userAgent: string): string;
    function buildContact(psContact: PsContact): Contact;
}
export interface Contact {
    readonly ps: PsContact;
    readonly pushInfos: {
        readonly pushType: string | undefined;
        readonly pushToken: string | undefined;
    };
    readonly uaInstance: {
        readonly dongle_imei: string;
        readonly instance_id: string;
    };
    readonly userAgent: string;
    readonly flowToken: string;
    readonly pretty: string;
}
export declare namespace Contact {
    function buildDialString(contacts: Iterable<Contact>): string;
    function getContactOfFlow(flowToken: string): Promise<Contact | undefined>;
    function wakeUpAllContacts(endpoint: string, getResultTimeout?: number): Promise<{
        reachableContacts: Set<Contact>;
        unreachableContacts: Set<Contact>;
    }>;
    function getEvtNewContact(): SyncEvent<Contact>;
    function getEvtExpiredContact(): SyncEvent<Contact>;
}
