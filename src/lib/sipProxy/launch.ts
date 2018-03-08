
import * as messages from "./messages/index_sipProxy";
import * as router from "./router";

let launchCount= 0;

export async function launch(){

    console.log({ launchCount });

    if( !launchCount ){

        await messages.initDialplan();

    }

    let backendSocketInst= await router.createBackendSocket();

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