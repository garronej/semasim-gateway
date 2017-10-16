import { DongleController as Dc } from "chan-dongle-extended-client";
import * as framework from "../tools/sipApiFramework";
import * as sipLibrary from "../tools/sipLibrary";
import * as db from "./db";
import * as phone from "../tools/phoneNumberLibrary";
import * as _ from "./sipApiClient";

import * as _debug from "debug";
let debug = _debug("_sipApi");

export function startListening(backendSocket: sipLibrary.Socket) {

    framework.startListening(backendSocket).attach(
        async ({ method, params, sendResponse }) => {

            debug(`${method}: params: ${JSON.stringify(params)}...`);
            
            let response= await handlers[method](params);

            debug(`...${method}: response: ${JSON.stringify(response)}`);

            sendResponse(response);

        }
    );

}


const handlers: Record<string, (params: any) => Promise<any>> = {};

(() => {

    let methodName = _.isDongleConnected.methodName;
    type Params = _.isDongleConnected.Params;
    type Response = _.isDongleConnected.Response;

    handlers[methodName] = async (params: Params): Promise<Response> => {

        let { imei } = params;

        if( Dc.getInstance().dongles.has(imei) ){

            return { "isConnected": true };

        }else{

            return { 
                "isConnected": false,
                "lastConnection": (await db.semasim.getDonglesLastConnection()).get(imei)!
            };

        }


    };

})();


(() => {

    let methodName = _.unlockDongle.methodName;
    type Params = _.unlockDongle.Params;
    type Response = _.unlockDongle.Response;

    function checkIfIccidMatch(iccid: string, last_four_digits_of_iccid: string) {
        return iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }

    handlers[methodName] = async (params: Params): Promise<Response> => {

        let { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try } = params;

        let dc = Dc.getInstance();

        let dongle = dc.dongles.get(imei);

        if (!dongle) {
            return { "status": "ERROR", "message": "Dongle is not connected" };
        }

        if (dongle.sim.iccid && checkIfIccidMatch(dongle.sim.iccid, last_four_digits_of_iccid)) {
            return { "status": "ERROR", "message": "Sim ICCID mismatch" };
        }

        let activeDongle: Dc.ActiveDongle;

        if (Dc.ActiveDongle.match(dongle)) {

            activeDongle = dongle;

        } else {

            for (let pin of [pin_first_try, pin_second_try, undefined]) {

                if (dongle.sim.pinState !== "SIM PIN" || dongle.sim.tryLeft === 1 || !pin) {

                    return {
                        "status": "STILL LOCKED",
                        "pinState": dongle.sim.pinState,
                        "tryLeft": dongle.sim.tryLeft
                    };

                }

                let unlockResult: Dc.UnlockResult;

                try {

                    unlockResult = await dc.unlock(dongle.imei, pin);

                } catch{

                    return { "status": "ERROR", "message": "dongle disconnect while unlocking" };

                }

                if (unlockResult.success) {
                    break;
                } else {
                    dongle.sim.pinState = unlockResult.pinState;
                    dongle.sim.tryLeft = unlockResult.tryLeft;
                }

            }

            try {

                let [dongle] = await dc.dongles.evtSet.waitFor(
                    ([dongle]) => Dc.ActiveDongle.match(dongle) && dongle.imei === imei,
                    45000
                );

                activeDongle = dongle as Dc.ActiveDongle;

            } catch {

                return { "status": "ERROR", "message": "Unlock success but dongle not found" };

            }

        }

        if (checkIfIccidMatch(activeDongle.sim.iccid, last_four_digits_of_iccid)) {
            return { "status": "ERROR", "message": "Sim have been unlocked but ICCID mismatch" };
        }

        return { "status": "SUCCESS", "dongle": activeDongle };

    };

})();
