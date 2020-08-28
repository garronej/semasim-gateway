import * as sip from "ts-sip";
export declare const evtConnect: import("evt/lib/types").Evt<sip.Socket>;
export declare function connect(): Promise<void>;
export declare function get(): sip.Socket | Promise<sip.Socket>;
