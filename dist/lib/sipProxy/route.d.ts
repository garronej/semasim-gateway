import { SyncEvent } from "ts-events-extended";
import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "./../types";
import "colors";
export declare const evtNewBackendSocketConnect: SyncEvent<sipLibrary.Socket>;
export declare const evtIncomingMessage: SyncEvent<{
    fromContact: types.Contact;
    sipRequest: sipLibrary.Request;
}>;
export declare const evtOutgoingMessage: SyncEvent<{
    sipRequest: sipLibrary.Request;
    prSipResponse: Promise<sipLibrary.Response>;
}>;
export declare function getBackendSocket(): sipLibrary.Socket | Promise<sipLibrary.Socket>;
export declare function start(): Promise<void>;
