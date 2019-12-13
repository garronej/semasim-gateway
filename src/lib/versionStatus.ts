import { module_dir_path, getEnv, getBaseDomain } from "../bin/installer";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import * as webApiDeclaration from "../web_api_declaration";
const localVersion: string = require(path.join(module_dir_path, "package.json"))["version"];

function genIntegerInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function genRetryDelay(): number {

    const env = getEnv();

    switch (env) {
        case "PROD":
            return genIntegerInRange(1000, 20 * 1000);
        case "DEV":

            console.log("DEV env, waiting only one second");

            return 1000;
    }

}

export type Version = {
    major: number;
    minor: number;
    patch: number;
};

export namespace Version {

    export function parse(version: string): Version {

        const match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)$/)!;

        return {
            "major": parseInt(match[1]),
            "minor": parseInt(match[2]),
            "patch": parseInt(match[3])
        };

    };

    export function stringify(v: Version) {
        return `${v.major}.${v.minor}.${v.patch}`;
    }

    /**
     * 
     * v1  <  v2  => -1
     * v1 === v2  => 0
     * v1  >  v2  => 1
     * 
     */
    export function compare(v1: Version, v2: Version): -1 | 0 | 1 {

        const sign = (n: number): -1 | 0 | 1 => n === 0 ? 0 : (n < 0 ? -1 : 1);

        if (v1.major === v2.major) {
            if (v1.minor === v2.minor) {
                return sign(v1.patch - v2.patch);
            } else {
                return sign(v1.minor - v2.minor);
            }
        } else {
            return sign(v1.major - v2.major);
        }

    }

}


export async function getVersion(): Promise<{
    value: string;
    status: "UP TO DATE" | "MAJOR" | "MINOR" | "PATCH";
}> {

    let value = "";

    while (!value) {

        try {

            //TODO: make sure that throw if backend is down
            //TODO: apparently we may have a response that match to null
            value = await scriptLib.web_get(
                `https://web.${getBaseDomain()}${webApiDeclaration.apiPath}/${webApiDeclaration.version.methodName}`
            );

        } catch{

            console.log(`${getBaseDomain()} is down`);

            await new Promise(
                resolve => setTimeout(resolve, genRetryDelay())
            );

        }

    }

    if (value === localVersion) {

        return { value, "status": "UP TO DATE" };

    } else {

        const localVersionParsed = Version.parse(localVersion);
        const serverVersionParsed = Version.parse(value);

        if (serverVersionParsed.major !== localVersionParsed.major) {

            return { value, "status": "MAJOR" };

        } else if (serverVersionParsed.minor !== localVersionParsed.minor) {

            return { value, "status": "MINOR" };

        } else {

            return { value, "status": "PATCH" };

        }

    }

}