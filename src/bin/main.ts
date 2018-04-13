require("rejection-tracker").main(__dirname, "..", "..");

process.on("warning", error=> { 

    console.log("WARNING WARNING WARNING");

    console.log(error.stack);

});

import { launch } from "../lib/launch";

launch();