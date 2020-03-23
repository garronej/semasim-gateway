import * as sip from "ts-sip";
import { Evt } from "evt";
export declare const evtConnect: Evt<sip.Socket>;
export declare function connect(): Promise<void>;
export declare function get(): sip.Socket | Promise<sip.Socket>;
