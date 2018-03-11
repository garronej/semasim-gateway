import { DongleController as Dc } from "chan-dongle-extended-client";
import * as apiDeclaration from "./../../sipApiDeclarations/semasimGateway/backendSocket";
import * as sipLibrary from "../../../tools/sipLibrary";
import * as remoteApi from "./remoteApiCaller";
import * as db from "../../db";

export const handlers: sipLibrary.api.Server.Handlers = {};

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

    const methodName = apiDeclaration.getUsableDongleHoldingSim.methodName;
    type Params = apiDeclaration.getUsableDongleHoldingSim.Params;
    type Response = apiDeclaration.getUsableDongleHoldingSim.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": ({ imsi })=> Promise.resolve(
            Array.from(Dc.getInstance().usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi)
        )
    };

    handlers[methodName]= handler;

})();

(() => {

    const methodName = apiDeclaration.whoHasLockedDongle.methodName;
    type Params = apiDeclaration.whoHasLockedDongle.Params;
    type Response = apiDeclaration.whoHasLockedDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": async ({ imei })=> 
            !!Dc.getInstance().lockedDongles.get(imei)?"I":undefined
    };

    handlers[methodName]= handler;

})();


(() => {

    const methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": async ({ imsi }) => {

            let dc = Dc.getInstance();

            let dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            
            if( !dongle ){
                return undefined;
            }

            let sipPassword=await db.asterisk.createEndpointIfNeededAndGetPassword(imsi);

            return { dongle, sipPassword };

        }
    };

    handlers[methodName]= handler;

})();

(() => {

    const methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imei, pin }) => {

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
        "handler": async ({ imsi }) => {

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

