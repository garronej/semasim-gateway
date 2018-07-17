import * as sipLibrary from "ts-sip";
import { VoidSyncEvent } from "ts-events-extended";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as logger from "logger";

let currentBackendSocketInst: sipLibrary.Socket | undefined = undefined;

export const evtNewBackendConnection = new VoidSyncEvent();

const idString= "backendSocket";

const server = new sipLibrary.api.Server(
    localApiHandlers, 
    sipLibrary.api.Server.getDefaultLogger({
        idString,
        "log": logger.log,
        "hideKeepAlive": true
    })
);

export function set(backendSocketInst: sipLibrary.Socket) {

    server.startListening(backendSocketInst);

    sipLibrary.api.client.enableKeepAlive(backendSocketInst);

    sipLibrary.api.client.enableErrorLogging(
        backendSocketInst, 
        sipLibrary.api.client.getDefaultErrorLogger({ 
            idString,
            "log": logger.log
        })
    );

    backendSocketInst.evtConnect.attachOnce(() =>
        evtNewBackendConnection.post()
    );

    currentBackendSocketInst = backendSocketInst;

}

export function get(): sipLibrary.Socket | Promise<sipLibrary.Socket> {

    if (
        !currentBackendSocketInst ||
        currentBackendSocketInst.evtClose.postCount ||
        !currentBackendSocketInst.evtConnect.postCount
    ) {

        return new Promise<sipLibrary.Socket>(
            resolve => evtNewBackendConnection.attachOnce(
                () => resolve(currentBackendSocketInst)
            )
        );

    } else {

        return currentBackendSocketInst;

    }

}
