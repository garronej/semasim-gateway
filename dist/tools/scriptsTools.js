"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const readline = require("readline");
const fs_1 = require("fs");
function run(command) {
    return new Promise((resolve, reject) => {
        child_process_1.exec(command, (error, stdout) => {
            if (error) {
                reject(new Error(error.message));
                return;
            }
            resolve(stdout);
        });
    });
}
exports.run = run;
function ask(question) {
    const rl = readline.createInterface({
        "input": process.stdin,
        "output": process.stdout
    });
    return new Promise(resolve => {
        rl.question(question + "\n> ", answer => {
            resolve(answer);
            rl.close();
        });
    });
}
exports.ask = ask;
function writeFileAssertSuccess(filename, data) {
    return new Promise(resolve => fs_1.writeFile(filename, data, { "encoding": "utf8", "flag": "w" }, error => {
        if (error) {
            console.log(`Error: Failed to write ${filename}: ${error.message}`.red);
            process.exit(1);
        }
        resolve();
    }));
}
exports.writeFileAssertSuccess = writeFileAssertSuccess;
