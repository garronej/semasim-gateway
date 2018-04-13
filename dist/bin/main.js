"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rejection-tracker").main(__dirname, "..", "..");
process.on("warning", error => {
    console.log("WARNING WARNING WARNING");
    console.log(error.stack);
});
const launch_1 = require("../lib/launch");
launch_1.launch();
