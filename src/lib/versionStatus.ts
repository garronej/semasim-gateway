import { module_dir_path, getEnv, getBaseDomain } from "../bin/installer";
import * as path from "path";
import * as scriptLib from "scripting-tools";
const localVersion: string = require(path.join(module_dir_path, "package.json"))["version"];

function genIntegerInRange(min, max): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function genRetryDelay() {

    switch (getEnv()) {
        case "PROD": 
            return genIntegerInRange(1000, 20 * 1000);
        case "DEV":

            console.log("DEV env, waiting only one second");

            return 1000;
    }


}

export async function getVersionStatus(): Promise<"UP TO DATE" | "MAJOR" | "MINOR" | "PATCH"> {

    let serverVersion = "";

    while (!serverVersion) {

        try {

            //TODO: make sure that throw if backend is down
            //TODO: apparently we may have a response that match to null
            serverVersion = await scriptLib.web_get(`web.${getBaseDomain()}/api/version`);

        } catch{

            console.log(`web.${getBaseDomain()} is down`);

            await new Promise(
                resolve => setTimeout(resolve, genRetryDelay())
            );

        }

    }

    if (serverVersion === localVersion) {

        return "UP TO DATE";

    } else {

        const parseVersion = (version: string) => {

            const match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)$/)!;

            return {
                "major": parseInt(match[1]),
                "minor": parseInt(match[2]),
                "patch": parseInt(match[3])
            };

        };

        const localVersionParsed = parseVersion(localVersion);
        const serverVersionParsed = parseVersion(serverVersion);

        if (serverVersionParsed.major !== localVersionParsed.major) {

            return "MAJOR";

        } else if (serverVersionParsed.minor !== localVersionParsed.minor) {

            return "MINOR";

        } else {

            return "PATCH";

        }

    }

}