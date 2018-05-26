import { launch } from "../lib/launch";
import { unix_user, working_directory_path } from "./installer";
import * as os from "os";

require("rejection-tracker").main(working_directory_path);

if( os.userInfo().username !== unix_user ){

    throw new Error(`Must be executed by unix user: ${unix_user}`);

}

process.once("SIGUSR2", () => {

    console.log("User requested stop");

    process.exit(0)

});

process.on("warning", error=> { 

    console.log("WARNING WARNING WARNING");

    console.log(error.stack);

});

launch();

