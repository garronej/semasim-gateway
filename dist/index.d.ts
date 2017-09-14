import * as sipLibrary from "./tools/sipLibrary";
import * as mySqlFunctions from "./tools/mySqlFunctions";
import * as sipApiFramework from "./tools/sipApiFramework";
import * as commanderFunctions from "./tools/commanderFunctions";
import * as sipApiClientBackend from "./lib/sipApiClientBackend";
import * as sipApiClientGateway from "./lib/sipApiClient";
import { Contact } from "./lib/sipContact";
export declare const c: {
    new (): {};
    readonly gatewayPort: 80;
    readonly flowTokenKey: "flowtoken";
    readonly domain: "semasim.com";
    readonly reg_expires: 21601;
    readonly regExpImei: RegExp;
    readonly regExpFourDigits: RegExp;
    readonly dnsSrv_sips_tcp: Promise<{
        name: string;
        port: number;
    }>;
};
export { sipLibrary, mySqlFunctions, sipApiFramework, sipApiClientBackend, sipApiClientGateway, Contact, commanderFunctions };
