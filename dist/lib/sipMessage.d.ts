import { SyncEvent } from "ts-events-extended";
import { Contact } from "./sipContact";
export declare const evtMessage: SyncEvent<{
    fromContact: Contact;
    toNumber: string;
    text: string;
}>;
export declare function startAccepting(): Promise<void>;
export declare function sendMessage(contact: Contact, from_number: string, headers: Record<string, string>, text: string, from_number_sim_name?: string): Promise<boolean>;
