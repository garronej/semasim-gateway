import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";
export declare type ApiRequest = {
    method: string;
    params: Record<string, any>;
    sendResponse: (response: Record<string, any>) => void;
};
export declare function startListening(sipSocket: sip.Socket): SyncEvent<ApiRequest>;
export declare function sendRequest(sipSocket: sip.Socket, method: string, params: Record<string, any>): Promise<Record<string, any>>;
