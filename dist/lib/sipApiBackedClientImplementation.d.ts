import { backendDeclaration as apiDeclaration } from "../sipApi";
import * as sipLibrary from "../tools/sipLibrary";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact } from "../lib/sipContact";
export declare function init(backendSocket: sipLibrary.Socket): void;
export declare function notifySimOnline(dongle: Dc.ActiveDongle): void;
export declare function notifySimOffline(imsi: string): void;
export declare function notifyNewOrUpdatedUa(ua: Contact.UaSim.Ua): void;
export declare function wakeUpContact(contact: Contact): Promise<apiDeclaration.wakeUpContact.Response>;
export declare function forceContactToRegister(contact: Contact): Promise<apiDeclaration.forceContactToReRegister.Response>;
