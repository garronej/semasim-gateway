import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "../types";
import { SyncEvent } from "ts-events-extended";
import * as asteriskSockets from "./asteriskSockets";
import "colors";
export declare const evtContactRegistration: SyncEvent<types.Contact>;
/** Must be called by router when new asteriskSocket is created */
export declare function onNewAsteriskSocket(asteriskSocket: sipLibrary.Socket, {connectionId, imsi}: asteriskSockets.Key): Promise<types.Contact>;
export declare function getContacts(imsi?: string): types.Contact[];
/** Close all asteriskSocket that has a contact registered to a IMSI */
export declare function discardContactsRegisteredToSim(imsi: string): void;
