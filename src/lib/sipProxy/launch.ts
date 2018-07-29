
import * as messages from "./messages";
import * as router from "./router";
import { getVersionStatus, genRetryDelay } from "../versionStatus";
import * as logger from "logger";

const debug = logger.debugFactory();

let isFistLaunch = true;

export function beforeExit() {
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl = () => Promise.resolve();
}

export async function launch() {

    if (isFistLaunch) {

        isFistLaunch = false;

        await messages.init();

    }

    const backendSocketInst = await router.createBackendSocket();

    beforeExit.impl = async () => backendSocketInst.destroy("Exiting the program");

    backendSocketInst.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        await new Promise(resolve => setTimeout(resolve, genRetryDelay()));

        if ("UP TO DATE" !== await getVersionStatus()) {

            debug("Need update, restarting ...");

            process.emit("beforeExit", process.exitCode = 0);

            return;

        }

        launch();

    });

}