import * as sipLibrary from "./tools/sipLibrary";
import * as mySqlFunctions from "./tools/mySqlFunctions";
import * as sipApiFramework from "./tools/sipApiFramework";
import * as commanderFunctions from "./tools/commanderFunctions";
import * as networkTools from "./tools/networkTools";
import * as sipApiClientBackend from "./lib/sipApiClientBackend";
import * as sipApiClientGateway from "./lib/sipApiClient";
import { Contact } from "./lib/sipContact";
export declare const c: {
    new (): {};
    readonly gatewayPort: 80;
    readonly domain: "semasim.com";
};
export { sipLibrary, mySqlFunctions, sipApiFramework, sipApiClientBackend, sipApiClientGateway, Contact, commanderFunctions, networkTools };
