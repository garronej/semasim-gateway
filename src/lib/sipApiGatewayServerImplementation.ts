import { DongleController as Dc } from "chan-dongle-extended-client";
import { gatewayDeclaration as apiDeclaration, protocol } from "../sipApi";
import * as sipLibrary from "../tools/sipLibrary";
import * as sipApiBackend from "./sipApiBackedClientImplementation";

const handlers: protocol.Server.Handlers = {};

const server = new protocol.Server(handlers);

export function startListening(backendSocket: sipLibrary.Socket) {
    server.startListening(backendSocket);
}

(() => {

    const methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => 
        Array.from(Dc.getInstance().dongles.values());

})();

(() => {

    const methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let { imei, pin } = params;

        let response: apiDeclaration.unlockDongle.Response;

        try{

            response= await Dc.getInstance().unlock(imei, pin);

        }catch{

            response= undefined;

        }

        return response;

    };

})();

(()=>{

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let { imsi } = params;

        let dc= Dc.getInstance();

        let dongle = Array.from(dc.activeDongles.values())
            .find(({ sim }) => sim.imsi === imsi);

        if (dongle) {

            sipApiBackend.notifySimOnline(dongle);

        }

        return undefined;

    };


})();

