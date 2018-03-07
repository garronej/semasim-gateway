import * as sipLibrary from "../../../tools/sipLibrary";
import { VoidSyncEvent } from "ts-events-extended";
export declare const evtNewSocketInstance: VoidSyncEvent;
export declare function set(backendSocketInst: sipLibrary.Socket): void;
export declare function get(): sipLibrary.Socket | Promise<sipLibrary.Socket>;
