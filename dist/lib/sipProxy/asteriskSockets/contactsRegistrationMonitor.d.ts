import * as sipLibrary from "../../../tools/sipLibrary";
import * as types from "../../types";
import { SyncEvent } from "ts-events-extended";
import * as store from "./store";
import "colors";
export declare const evtContactRegistration: SyncEvent<types.Contact>;
export declare function onNewAsteriskSocket(asteriskSocket: sipLibrary.Socket, {connectionId, imsi}: store.Key): void;
export declare function getSocketContact(socket: sipLibrary.Socket): types.Contact | Promise<types.Contact>;
export declare function getContacts(imsi?: string): types.Contact[];
/** Close all asteriskSocket that has a contact registered to a IMSI */
export declare function discardContactsRegisteredToSim(imsi: string): void;
