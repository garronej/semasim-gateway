import { DongleController as Dc } from "chan-dongle-extended-client";
import * as apiDeclaration from "./../../sipApiDeclarations/semasimGateway/backendSocket";
import * as sipLibrary from "../../../tools/sipLibrary";
import * as remoteApi from "./remoteApiCaller";

export const handlers: sipLibrary.api.Server.Handlers = {};

/*
const server = new protocol.Server(handlers);

export function startListening(backendSocket: sipLibrary.Socket) {
    server.startListening(backendSocket);
}
*/

(() => {

    const methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": ()=> Promise.resolve(
            Array.from(Dc.getInstance().dongles.values())
        )
    };

    handlers[methodName]= handler;

})();

(() => {

    const methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async params => {

            let { imei, pin } = params;

            try {

                return await Dc.getInstance().unlock(imei, pin);

            } catch{

                return undefined;

            }

        }
    };

    handlers[methodName]= handler;

})();

(() => {

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async params => {

            let { imsi } = params;

            let dc = Dc.getInstance();

            let dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);

            if (dongle) {

                remoteApi.notifySimOnline(dongle);

            }

            return undefined;

        }
    };

    handlers[methodName]= handler;

})();

