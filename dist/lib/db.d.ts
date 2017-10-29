import { SyncEvent } from "ts-events-extended";
import { Contact } from "./sipContact";
import { DongleController as Dc } from "chan-dongle-extended-client";
export declare namespace asterisk {
    function initializeEvt(): Promise<void>;
    const query: (sql: string, values?: (string | number | null)[] | undefined) => Promise<any>;
    function getEvtNewContact(): SyncEvent<Contact>;
    function getEvtExpiredContact(): SyncEvent<Contact>;
    function getContacts(endpoint: Contact.UaEndpoint.EndpointRef): Promise<Contact[]>;
    /** for test purpose only */
    function flush(): Promise<void>;
    function flushContacts(): Promise<void>;
    function deleteContact(contact: Contact): Promise<boolean>;
    function addEndpoint(imei: string, iccid: string): Promise<void>;
    function getIccidOfEndpoint(imei: string): Promise<string>;
}
export declare namespace semasim {
    const query: (sql: string, values?: (string | number | null)[] | undefined) => Promise<any>;
    /** Only for test purpose */
    function flush(): Promise<void>;
    function addDongle(dongle: Dc.LockedDongle): Promise<void>;
    /** return set of imei => last_connection_date */
    function getDonglesLastConnection(): Promise<Map<string, Date>>;
    function addEndpoint(dongle: Dc.ActiveDongle): Promise<void>;
    function getUas(imei: string): Promise<Contact.UaEndpoint.Ua[]>;
    /** Used to join asterisk.ps_endpoint and semasim.endpoint, used when building contact */
    function getEndpoint(endpointRef: Contact.UaEndpoint.EndpointRef): Promise<Contact.UaEndpoint.Endpoint>;
    function getEndpoints(): Promise<Contact.UaEndpoint.Endpoint[]>;
    type AddUaEndpointResult = {
        isNewUa: false;
        isFirstUaEndpointOfEndpoint: false;
    } | {
        isNewUa: true;
        isFirstUaEndpointOfEndpoint: boolean;
    };
    /** Return true if ua_endpoint entry created */
    function addUaEndpoint(uaEndpoint: Contact.UaEndpoint): Promise<AddUaEndpointResult>;
    interface MessageTowardGsm {
        date: Date;
        uaEndpoint: Contact.UaEndpoint;
        to_number: string;
        text: string;
    }
    namespace MessageTowardGsm {
        function add(to_number: string, text: string, uaEndpoint: Contact.UaEndpointRef): Promise<void>;
        type Confirm = {
            setSent(sentDate: Date | null): Promise<void>;
            setStatusReport(statusReport: Dc.StatusReport): Promise<void>;
        };
        function getUnsent(endpoint: Contact.UaEndpoint.EndpointRef): Promise<[MessageTowardGsm, Confirm][]>;
    }
    function lastGsmMessageReceived(endpoint: Contact.UaEndpoint.EndpointRef): Promise<Date | undefined>;
    interface MessageTowardSip {
        isReport: boolean;
        date: Date;
        from_number: string;
        text: string;
    }
    namespace MessageTowardSip {
        type TargetUaEndpoint = {
            is: "ALL UA_ENDPOINT OF ENDPOINT";
            endpoint: Contact.UaEndpoint.EndpointRef;
        } | {
            is: "UA_ENDPOINT";
            uaEndpoint: Contact.UaEndpointRef;
        } | {
            is: "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA";
            endpoint: Contact.UaEndpoint.EndpointRef;
            excludeUa: Contact.UaEndpoint.UaRef;
        };
        function add(from_number: string, text: string, date: Date, is_report: boolean, target: TargetUaEndpoint): Promise<void>;
        function unsentCount(uaEndpoint: Contact.UaEndpointRef): Promise<number>;
        function getUnsent(uaEndpoint: Contact.UaEndpointRef): Promise<[MessageTowardSip, () => Promise<void>][]>;
    }
}
