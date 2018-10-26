"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const installer_1 = require("../bin/installer");
const path = require("path");
const scriptLib = require("scripting-tools");
const localVersion = require(path.join(installer_1.module_dir_path, "package.json"))["version"];
function genIntegerInRange(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function genRetryDelay() {
    if (installer_1.getIsProd()) {
        return genIntegerInRange(1000, 20 * 1000);
    }
    else {
        console.log("Dev mode, waiting only one second");
        return 1000;
    }
}
exports.genRetryDelay = genRetryDelay;
function getVersionStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        let serverVersion = "";
        while (!serverVersion) {
            try {
                //TODO: make sure that throw if backend is down
                //TODO: apparently we may have a response that match to null
                serverVersion = yield scriptLib.web_get("semasim.com/api/version");
            }
            catch (_a) {
                console.log("Semasim.com is down");
                yield new Promise(resolve => setTimeout(resolve, genRetryDelay()));
            }
        }
        if (serverVersion === localVersion) {
            return "UP TO DATE";
        }
        else {
            const parseVersion = (version) => {
                const match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)$/);
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
            }
            else if (serverVersionParsed.minor !== localVersionParsed.minor) {
                return "MINOR";
            }
            else {
                return "PATCH";
            }
        }
    });
}
exports.getVersionStatus = getVersionStatus;
