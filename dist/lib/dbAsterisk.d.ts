import { SyncEvent } from "ts-events-extended";
import * as types from "./types";
import * as f from "../tools/mySqlFunctions";
/** is exported only for tests */
export declare const query: (sql: string) => Promise<any>, esc: (value: f.TSql) => string, buildInsertQuery: (table: string, obj: Record<string, string | number | {
    "@": string;
} | null>, onDuplicateKey: "IGNORE" | "UPDATE" | "THROW ERROR") => string;
/** for test purpose only */
export declare function flush(): Promise<void>;
export declare const evtNewContact: SyncEvent<types.Contact>;
export declare const evtExpiredContact: SyncEvent<types.Contact>;
export declare function startListeningPsContacts(): Promise<void>;
export declare function deleteContact(contact: types.Contact): Promise<boolean>;
export declare function createEndpointIfNeededAndGetPassword(imsi: string, renewPassword?: "RENEW PASSWORD" | undefined): Promise<string>;
