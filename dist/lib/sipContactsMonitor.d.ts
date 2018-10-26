import * as sipLibrary from "ts-sip";
import * as types from "./types";
import { SyncEvent } from "ts-events-extended";
export declare const evtContactRegistration: SyncEvent<types.Contact>;
export declare function getContacts(imsi?: string): types.Contact[];
/** Close all asteriskSocket that has a contact registered to a IMSI */
export declare function discardContactsRegisteredToSim(imsi: string): void;
/** should be called against every new asterisk socket */
export declare function handleAsteriskSocket(asteriskSocket: sipLibrary.Socket): Promise<types.Contact>;
