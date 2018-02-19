import * as types from "../types";
import { evtMessage, sendMessage, sipMessageContext } from "./messages";
import { evtNewBackendSocketConnect, getBackendSocket } from "./route";
import * as asteriskSockets from "./asteriskSockets";
import evtContactRegistration = asteriskSockets.evtContactRegistration;
declare function getContacts(imsi?: string): types.Contact[];
declare function flushRegistrations(imsi: string): void;
declare function start(): Promise<void>;
export { evtMessage, sendMessage, sipMessageContext, evtNewBackendSocketConnect, getBackendSocket, getContacts, flushRegistrations, evtContactRegistration, start };
