import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../tools/sipLibrary";
import { Contact } from "./sipContact";
import "colors";
export declare const evtIncomingMessage: SyncEvent<{
    fromContact: Contact;
    sipRequest: sipLibrary.Request;
}>;
export declare const evtOutgoingMessage: SyncEvent<{
    sipRequest: sipLibrary.Request;
    prSipResponse: Promise<sipLibrary.Response>;
}>;
export declare function getBackendSocket(): Promise<sipLibrary.Socket>;
export declare function start(): Promise<void>;
