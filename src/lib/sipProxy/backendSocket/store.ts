import * as sipLibrary from "../../../tools/sipLibrary";
import { VoidSyncEvent } from "ts-events-extended";
import { handlers as localApiHandlers } from "./localApiHandlers";

let currentBackendSocketInst: sipLibrary.Socket | undefined = undefined;

export const evtNewSocketInstance = new VoidSyncEvent();

const server = new sipLibrary.api.Server(localApiHandlers);

export function set(backendSocketInst: sipLibrary.Socket) {

    server.startListening(backendSocketInst);

    sipLibrary.api.client.enableKeepAlive(backendSocketInst);

    backendSocketInst.evtConnect.attachOnce(() =>
        evtNewSocketInstance.post()
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
            resolve => evtNewSocketInstance.attachOnce(
                () => resolve(currentBackendSocketInst)
            )
        );

    } else {

        return currentBackendSocketInst;

    }

}




