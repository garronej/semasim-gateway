import * as sip from "ts-sip";
import * as types from "../types";
/** Assert we have an active backend connection */
export declare function handle(socket: sip.Socket, connectionId: string, prPlatform: Promise<types.Ua.Platform>): void;
