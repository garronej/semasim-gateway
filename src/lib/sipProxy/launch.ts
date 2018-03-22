
import * as messages from "./messages";
import * as router from "./router";

import "colors";

let launchCount= 0;

export async function launch(){

    console.log({ launchCount });

    if( !launchCount ){

        await messages.init();

    }

    let backendSocketInst= await router.createBackendSocket();

    backendSocketInst.evtConnect.waitFor(10000).catch(()=>{

        console.log("WARN WARN WARN connection to backend took too much time".red);

        backendSocketInst.destroy();

    });

    backendSocketInst.evtClose.attachOnce(async () => {

        console.log("Backend socket closed, waiting and restarting");

        let delay = (function getRandomArbitrary(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        })(3000, 5000);

        await new Promise(resolve => setTimeout(resolve, delay));

        launch();

    });

    launchCount++;

}