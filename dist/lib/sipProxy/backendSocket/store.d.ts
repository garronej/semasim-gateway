import * as sipLibrary from "ts-sip";
import { VoidSyncEvent } from "ts-events-extended";
export declare const evtNewBackendConnection: VoidSyncEvent;
export declare function set(backendSocketInst: sipLibrary.Socket): void;
export declare function get(): sipLibrary.Socket | Promise<sipLibrary.Socket>;
