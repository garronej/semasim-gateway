import * as types from "../types";
import { evtMessage, sendMessage, sipMessageContext } from "./messages";
import { evtNewBackendSocketConnect, getBackendSocket } from "./route";
declare function getContacts(imsi?: string): types.Contact[];
declare function start(): Promise<void>;
export { evtMessage, sendMessage, sipMessageContext, evtNewBackendSocketConnect, getBackendSocket, getContacts, start };
