import * as sipLibrary from "./tools/sipLibrary";
import * as mySqlFunctions from "./tools/mySqlFunctions";
import * as sipApiFramework from "./tools/sipApiFramework";
import * as sipApiClientBackend from "./lib/sipApiClientBackend";
import * as sipApiClientGateway from "./lib/sipApiClient";
import { Contact } from "./lib/sipContact";
export declare const c: {
    new (): {};
    readonly backendSipProxyListeningPortForGateways: 50610;
    readonly flowTokenKey: "flowtoken";
    readonly backendHostname: "semasim.com";
    readonly reg_expires: 21601;
    readonly regExpImei: RegExp;
    readonly regExpFourDigits: RegExp;
};
export { sipLibrary, mySqlFunctions, sipApiFramework, sipApiClientBackend, sipApiClientGateway, Contact };
