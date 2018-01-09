import { SyncEvent } from "ts-events-extended";
import { Contact } from "./sipContact";
import * as f from "../tools/mySqlFunctions";
import { DongleController as Dc } from "chan-dongle-extended-client";
export declare namespace asterisk {
    /** is exported only for tests */
    const query: (sql: string, values?: f.TSql[] | undefined) => Promise<any>;
    /** for test purpose only */
    function flush(): Promise<void>;
    const evtNewContact: SyncEvent<Contact>;
    const evtExpiredContact: SyncEvent<Contact>;
    function startListeningPsContacts(): Promise<void>;
    function deleteContact(contact: Contact): Promise<boolean>;
    function createEndpointIfNeededAndGetPassword(imsi: string, renewPassword?: "RENEW PASSWORD" | undefined): Promise<string>;
}
export declare namespace semasim {
    const query: (sql: string, values?: f.TSql[] | undefined) => Promise<any>;
    /** Only for test purpose */
    function flush(): Promise<void>;
    function addUaSim(uaSim: Contact.UaSim): Promise<{
        isUaCreatedOrUpdated: boolean;
        isFirstUaForSim: boolean;
    }>;
    function removeUaSim(imsi: string, uasToKeep?: Contact.UaSim.Ua[]): Promise<void>;
    interface MessageTowardGsm {
        date: Date;
        uaSim: Contact.UaSim;
        toNumber: string;
        text: string;
    }
    namespace MessageTowardGsm {
        function add(toNumber: string, text: string, uaSim: Contact.UaSim): Promise<void>;
        type Confirm = {
            setSent(sentDate: Date | null): Promise<void>;
            setStatusReport(statusReport: Dc.StatusReport): Promise<void>;
        };
        function getUnsent(imsi: string): Promise<[MessageTowardGsm, Confirm][]>;
    }
    function lastMessageReceivedDateBySim(): Promise<{
        [imsi: string]: Date;
    }>;
    interface MessageTowardSip {
        isReport: boolean;
        date: Date;
        fromNumber: string;
        text: string;
    }
    namespace MessageTowardSip {
        type Target = {
            target: "SPECIFIC UA REGISTERED TO SIM";
            uaSim: Contact.UaSim;
        } | {
            target: "ALL UA REGISTERED TO SIM";
            imsi: string;
        } | {
            target: "ALL OTHER UA OF USER REGISTERED TO SIM";
            uaSim: Contact.UaSim;
        } | {
            target: "ALL UA OF OTHER USERS REGISTERED TO SIM";
            uaSim: Contact.UaSim;
        };
        /** return true if message_toward_sip added */
        function add(fromNumber: string, text: string, date: Date, isReport: boolean, target: Target): Promise<boolean>;
        function unsentCount(uaSim: Contact.UaSim): Promise<number>;
        /** Return array of [ MessageTowardSip, setDelivered ] */
        function getUnsent(uaSim: Contact.UaSim): Promise<[MessageTowardSip, () => Promise<void>][]>;
    }
}
