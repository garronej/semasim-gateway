import { SyncEvent } from "ts-events-extended";
import * as db from "./db";
import * as sipApiBackend from "./sipApiClientBackend";
export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace Contact {
    function readPushInfos(contactOrContactUri: Contact | string): {
        pushType: string | undefined;
        pushToken: string | undefined;
    };
    function buildUaInstancePk(contact: Contact): db.semasim.UaInstancePk;
    function buildValueOfUserAgentField(endpoint: string, instanceId: string, realUserAgent: string): string;
    function readInstanceId(contact: Contact): string;
    function readUserAgent(contact: Contact): string;
    function readFlowToken(contact: Contact): string;
    function readAstSocketSrcPort(contact: Contact): number;
    function pretty(contact: Contact): Record<string, string>;
}
export declare namespace contactIo {
    function getContactFromAstSocketSrcPort(astSocketSrcPort: number): Promise<Contact | undefined>;
    type WakeUpAllContactsTracer = SyncEvent<{
        type: "reachableContact";
        contact: Contact;
    } | {
        type: "completed";
    }>;
    function wakeUpAllContacts(endpoint: string, timeout?: number, evtTracer?: WakeUpAllContactsTracer): Promise<{
        reachableContacts: Contact[];
        unreachableContacts: Contact[];
    }>;
    type WakeUpContactTracer = SyncEvent<sipApiBackend.wakeUpUserAgent.Response["status"]>;
    function wakeUpContact(contact: Contact, timeout?: number, evtTracer?: WakeUpContactTracer): Promise<Contact | null>;
    function getEvtNewContact(): SyncEvent<Contact>;
    function getEvtExpiredContact(): SyncEvent<string>;
}
