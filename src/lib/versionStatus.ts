import { module_dir_path, getIsProd } from "../bin/installer";
import * as path from "path";
import * as scriptLib from "scripting-tools";
const localVersion = require(path.join(module_dir_path, "package.json"))["version"];

function genIntegerInRange(min, max): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function genRetryDelay(){

    if( getIsProd() ){

        return genIntegerInRange(1000, 20*1000);

    }else{

        return 1000;

    }

}

export async function getVersionStatus(): Promise<"UP TO DATE" | "MAJOR" | "MINOR" | "PATCH"> {

    let serverVersion = "";

    while (!serverVersion) {

        try {

            //TODO: make sure that throw if backend is down
            serverVersion = await scriptLib.exec(`wget -qO- semasim.com/api/version`);

        } catch{

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