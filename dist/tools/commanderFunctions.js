"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var readline = require("readline");
var fs_1 = require("fs");
function run(command) {
    return new Promise(function (resolve, reject) {
        child_process_1.exec(command, function (error, stdout) {
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
    var rl = readline.createInterface({
        "input": process.stdin,
        "output": process.stdout
    });
    return new Promise(function (resolve) {
        rl.question(question + "\n> ", function (answer) {
            resolve(answer);
            rl.close();
        });
    });
}
exports.ask = ask;
function writeFileAssertSuccess(filename, data) {
    return new Promise(function (resolve) { return fs_1.writeFile(filename, data, { "encoding": "utf8", "flag": "w" }, function (error) {
        if (error) {
            console.log(("Error: Failed to write " + filename + ": " + error.message).red);
            process.exit(1);
        }
        resolve();
    }); });
}
exports.writeFileAssertSuccess = writeFileAssertSuccess;
