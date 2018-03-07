import * as sipLibrary from "../../../tools/sipLibrary";
import { SyncEvent } from "ts-events-extended";
export declare const evtNewSocketInstance: SyncEvent<sipLibrary.Socket>;
export declare function get(): sipLibrary.Socket | Promise<sipLibrary.Socket>;
export declare namespace _protected {
    function set(backendSocketInst: sipLibrary.Socket): void;
}
