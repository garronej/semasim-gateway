
import * as messages from "./messages";
import * as router from "./router";

export async function launch(){

    await messages._protected.initDialplan();

    router.launch();

}