import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact } from "./sipContact";
export declare function sendMessagesOfDongle(dongle: Dc.ActiveDongle): void;
export declare function notifyNewSipMessagesToSend(imsi: string): Promise<void>;
/** Contact must be reachable */
export declare function sendMessagesOfContact(contact: Contact): void;
