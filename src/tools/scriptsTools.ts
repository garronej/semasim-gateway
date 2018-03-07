
import { exec } from "child_process";
import * as readline from "readline";
import { writeFile } from "fs";

export function run(command: string): Promise<string> {

    return new Promise<string>((resolve, reject) => {

        exec(command, (error, stdout) => {

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(stdout);

        });

    });

}

export function ask(question): Promise<string> {

    const rl = readline.createInterface({
        "input": process.stdin,
        "output": process.stdout
    })

    return new Promise<string>(resolve => {

        rl.question(question + "\n> ", answer => {

            resolve(answer);

            rl.close();

        });


    });

}

export function writeFileAssertSuccess(filename: string, data: string): Promise<void> {

    return new Promise<void>(
        resolve => writeFile(
            filename,
            data,
            { "encoding": "utf8", "flag": "w" },
            error => {
                if (error) {
                    console.log(`Error: Failed to write ${filename}: ${error.message}`.red);
                    process.exit(1);
                }
                resolve();
            }
        )
    );

}


