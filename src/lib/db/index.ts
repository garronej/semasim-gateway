import * as semasim from "./semasim";
import * as asterisk from "./asterisk";
import { safePr } from "scripting-tools";

async function launch(): Promise<void> {

    await Promise.all([ 
        asterisk.launch(), 
        semasim.launch() 
    ]);

}

async function beforeExit() {

    return Promise.all([
        safePr(semasim.beforeExit()),
        safePr(asterisk.beforeExit())
    ]);

}

export { launch, beforeExit, semasim, asterisk };
