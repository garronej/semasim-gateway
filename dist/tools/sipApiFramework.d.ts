import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";
export declare type ApiRequest = {
    method: string;
    params: any;
    sendResponse: (response: any) => void;
};
export declare type ApiEvent = {
    name: string;
    data: string;
};
export declare function startListening(sipSocket: sip.Socket): {
    evtApiRequest: SyncEvent<ApiRequest>;
    evtApiEvent: SyncEvent<ApiEvent>;
};
export declare function sendEvent(sipSocket: sip.Socket, name: string, data: any): Promise<void>;
export declare const errorSendRequest: {
    "timeout": string;
    "writeFailed": string;
    "sockedCloseBeforeResponse": string;
    "malformedResponse": string;
};
export declare function sendRequest(sipSocket: sip.Socket, method: string, params: any, timeout?: number): Promise<any>;
