"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rejection-tracker").main(__dirname, "..", "..");
process.on("warning", error => {
    console.log("WARNING WARNING WARNING");
    console.log(error.stack);
});
const launch_1 = require("../lib/launch");
const installer_1 = require("./installer");
const os = require("os");
if (os.userInfo().username !== installer_1.unix_user) {
    throw new Error(`Must be executed by unix user: ${installer_1.unix_user}`);
}
launch_1.launch();
process.once("SIGUSR2", () => {
    console.log("User requested stop");
    process.exit(0);
});
