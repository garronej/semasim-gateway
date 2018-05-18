require("rejection-tracker").main(__dirname, "..", "..");

process.on("warning", error=> { 

    console.log("WARNING WARNING WARNING");

    console.log(error.stack);

});

import { launch } from "../lib/launch";
import { unix_user } from "./installer";
import * as os from "os";

if( os.userInfo().username !== unix_user ){

    throw new Error(`Must be executed by unix user: ${unix_user}`);

}

launch();

process.once("SIGUSR2", () => {

    console.log("User requested stop");

    process.exit(0)

});

