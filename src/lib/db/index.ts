import * as semasim from "./semasim";
import * as asterisk from "./asterisk";

async function launch(): Promise<void> {

    await Promise.all([ 
        asterisk.launch(), 
        semasim.launch() 
    ]);

}

export { launch, semasim, asterisk };
