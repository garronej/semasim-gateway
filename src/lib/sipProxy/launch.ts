
import * as messages from "./messages/index_sipProxy";
import * as router from "./router";

export async function launch(){

    await messages.initDialplan();

    router.launch();

}