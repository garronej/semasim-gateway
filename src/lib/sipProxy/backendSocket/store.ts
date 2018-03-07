import * as sipLibrary from "../../../tools/sipLibrary";
import { SyncEvent } from "ts-events-extended";
import { handlers as localApiHandlers } from "./localApiHandlers";

let currentBackendSocketInst: sipLibrary.Socket | undefined = undefined;

export const evtNewSocketInstance = new SyncEvent<sipLibrary.Socket>();

export function get(): sipLibrary.Socket | Promise<sipLibrary.Socket> {

    if (
        !currentBackendSocketInst ||
        currentBackendSocketInst.evtClose.postCount ||
        !currentBackendSocketInst.evtConnect.postCount
    ) {

        return evtNewSocketInstance.waitFor();

    } else {

        return currentBackendSocketInst;

    }

}

export namespace _protected {

    const server = new sipLibrary.api.Server(localApiHandlers);

    export function set(backendSocketInst: sipLibrary.Socket) {

        server.startListening(backendSocketInst);

        backendSocketInst.evtConnect.attachOnce(() => {

            new sipLibrary.api.Client(backendSocketInst);

            evtNewSocketInstance.post(backendSocketInst);

        });

        currentBackendSocketInst = backendSocketInst;

    }

}
