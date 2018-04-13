import * as sipLibrary from "ts-sip";
import * as types from "../types";
import { SyncEvent } from "ts-events-extended";
import "colors";
export declare const evtContactRegistration: SyncEvent<types.Contact>;
export declare function getContacts(imsi?: string): types.Contact[];
/** Close all asteriskSocket that has a contact registered to a IMSI */
export declare function discardContactsRegisteredToSim(imsi: string): void;
export declare function onNewAsteriskSocket(asteriskSocket: sipLibrary.Socket): Promise<types.Contact>;
