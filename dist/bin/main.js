"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const launch_1 = require("../lib/launch");
const installer_1 = require("./installer");
const os = require("os");
require("rejection-tracker").main(installer_1.working_directory_path);
if (os.userInfo().username !== installer_1.unix_user) {
    throw new Error(`Must be executed by unix user: ${installer_1.unix_user}`);
}
process.once("SIGUSR2", () => {
    console.log("User requested stop");
    process.exit(0);
});
process.on("warning", error => {
    console.log("WARNING WARNING WARNING");
    console.log(error.stack);
});
launch_1.launch();
