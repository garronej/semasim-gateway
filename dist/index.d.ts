import * as sipLibrary from "./tools/sipLibrary";
import * as mySqlFunctions from "./tools/mySqlFunctions";
import * as commanderFunctions from "./tools/commanderFunctions";
import * as networkTools from "./tools/networkTools";
import { Contact } from "./lib/sipContact";
export declare const c: {
    new (): {};
    readonly gatewayPort: 80;
    readonly domain: "semasim.com";
    isValidEmail(email: string, mustBeLc?: "MUST BE LOWER CASE" | undefined): boolean;
};
import * as sipApi from "./sipApi";
import * as genSamples from "./test/genSamples";
export { sipLibrary, mySqlFunctions, Contact, commanderFunctions, networkTools, sipApi, genSamples };
