import * as types from "../types";

import { evtMessage, sendMessage, sipMessageContext, startHandling as startHandlingMessages } from "./messages";
import { start as startRoute, evtNewBackendSocketConnect, getBackendSocket } from "./route";
import * as  asteriskSockets  from "./asteriskSockets";
import evtContactRegistration= asteriskSockets.evtContactRegistration;

function getContacts( imsi?: string): types.Contact[] {
    return asteriskSockets.getContacts(imsi);
}

function flushRegistrations(
    imsi: string,
): void {
    asteriskSockets.flush(imsi);
}

async function start(){

    await startHandlingMessages();

    await startRoute();

}

export { 
    evtMessage,
    sendMessage,
    sipMessageContext,
    evtNewBackendSocketConnect,
    getBackendSocket,
    getContacts,
    flushRegistrations,
    evtContactRegistration,
    start
};