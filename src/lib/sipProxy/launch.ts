
import * as messages from "./messages";
import * as router from "./router";
import { getVersionStatus, genRetryDelay } from "../versionStatus";
import * as logger from "logger";

const debug = logger.debugFactory();

let isFistLaunch= true;

export async function launch(){

    if( isFistLaunch ){

        isFistLaunch=false;

        await messages.init();

    }

    let backendSocketInst= await router.createBackendSocket();

    backendSocketInst.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        await new Promise(resolve => setTimeout(resolve, genRetryDelay()));

        if( "UP TO DATE" !== await getVersionStatus() ){

            debug("Need update, restarting ...");

            process.exit(1);

        }

        launch();

    });

}