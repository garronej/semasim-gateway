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
export declare function buildDialString(contacts: Iterable<Contact>): string;
export declare function wakeUpAllContactsOfEndpoint(endpoint: string, getResultTimeout?: number): Promise<{
    reachableContacts: Set<Contact>;
    unreachableContacts: Set<Contact>;
}>;
