import * as types from "../types";

import { evtMessage, sendMessage, sipMessageContext, startHandling as startHandlingMessages } from "./messages";
import { start as startRoute, evtNewBackendSocketConnect, getBackendSocket } from "./route";
import { asteriskSockets } from "./asteriskSockets";

function getContacts(
    imsi?: string
): types.Contact[] {

    return asteriskSockets.getContacts(imsi);

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
    start
};