import * as sip from "ts-sip";
import { SyncEvent } from "ts-events-extended";
export declare const evtConnect: SyncEvent<sip.Socket>;
export declare function connect(): Promise<void>;
export declare function get(): sip.Socket | Promise<sip.Socket>;
