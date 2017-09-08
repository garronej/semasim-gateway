import { DongleExtendedClient, typesDef as t } from "chan-dongle-extended-client";
import * as framework from "../tools/sipApiFramework";
import * as sipLibrary from "../tools/sipLibrary";
import { asterisk as dbAsterisk } from "./db";
import * as _ from "./sipApiClient";

import * as _debug from "debug";
let debug = _debug("_sipApi");

export function startListening(backendSocket: sipLibrary.Socket) {

    framework.startListening(backendSocket).attach(
        async ({ method, params, sendResponse }) => sendResponse(await handlers[method](params))
    );

}

type Payload = Record<string, any>;

const handlers: Record<string, (params: Payload) => Promise<Payload>> = {};

(() => {

    let methodName = _.isDongleConnected.methodName;
    type Params = _.isDongleConnected.Params;
    type Response = _.isDongleConnected.Response;

    handlers[methodName] = async (params: Params): Promise<Response> => {

        debug(`handle ${methodName}`);

        let { imei } = params;

        let isConnected = (await DongleExtendedClient.localhost().getConnectedDongles()).indexOf(imei) >= 0;

        let lastConnectionTimestamp = await dbAsterisk.queryLastConnectionTimestampOfDonglesEndpoint(imei);

        return { isConnected, lastConnectionTimestamp };

    };

})();

(() => {

    let methodName = _.doesDongleHasSim.methodName;
    type Params = _.doesDongleHasSim.Params;
    type Response = _.doesDongleHasSim.Response;

    handlers[methodName] = async (params: Params): Promise<Response> => {

        debug(`handle ${methodName}`, params);

        let { imei, last_four_digits_of_iccid } = params;

        let dongleClient = DongleExtendedClient.localhost();

        let dongle = await dongleClient.getActiveDongle(imei);

        if (
            dongle &&
            (dongle.iccid.substring(dongle.iccid.length - 4) === last_four_digits_of_iccid)
        ) return { "value": true };

        let lockedDongle = (await dongleClient.getLockedDongles()).filter(d => d.imei === imei).pop();

        if (!lockedDongle) return { "value": false };

        if (lockedDongle.iccid.substring(lockedDongle.iccid.length - 4) === last_four_digits_of_iccid)
            return { "value": true };
        else
            return { "value": "MAYBE" };

    };

})();


(() => {

    let methodName = _.unlockDongle.methodName;
    type Params = _.unlockDongle.Params;
    type Response = _.unlockDongle.Response;

    function isValidPass(iccid: string, last_four_digits_of_iccid: string) {
        return !iccid || iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }

    handlers[methodName] = async (params: Params): Promise<Response> => {

        debug(`handle ${methodName}`);

        let { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try }= params;

        let dongleClient = DongleExtendedClient.localhost();

        try {

            let activeDongle = await dongleClient.getActiveDongle(imei);

            if (activeDongle) {

                if (!isValidPass(activeDongle.iccid, last_four_digits_of_iccid))
                    throw new Error("ICCID does not match");

                return {
                    "dongleFound": true,
                    "pinState": "READY",
                    "iccid": activeDongle.iccid,
                    "number": activeDongle.number,
                    "serviceProvider": activeDongle.serviceProvider
                };

            }

            let lockedDongle: t.LockedDongle | undefined= undefined;

            let lockedDongles= await dongleClient.getLockedDongles();

            for( let i=0; i<lockedDongles.length; i++){

                    if (lockedDongles[i].imei !== imei) 
                        continue;

                    if (!isValidPass(lockedDongles[i].iccid, last_four_digits_of_iccid)) 
                        continue;

                    lockedDongle= lockedDongles[i];

                    break;

            }

            if( !lockedDongle ) throw new Error("Locked dongle not found");

            if (lockedDongle.pinState !== "SIM PIN" || lockedDongle.tryLeft !== 3 || !pin_first_try)
                return { 
                    "dongleFound": true, 
                    "pinState": lockedDongle.pinState, 
                    "tryLeft": lockedDongle.tryLeft 
                };


            let attemptUnlock = async (pin: string): Promise<t.LockedDongle | t.DongleActive> => {

                await dongleClient.unlockDongle(imei, pin);

                return await Promise.race([
                    dongleClient.evtNewActiveDongle.waitFor(newActiveDongle => newActiveDongle.imei === imei),
                    dongleClient.evtRequestUnlockCode.waitFor(lockedDongle => lockedDongle.imei === imei)
                ]);

            };

            let matchLocked = (dongle: t.LockedDongle | t.DongleActive): dongle is t.LockedDongle => dongle["pinState"];

            let resultFirstTry = await attemptUnlock(pin_first_try);

            if (!matchLocked(resultFirstTry))
                return {
                    "dongleFound": true,
                    "pinState": "READY",
                    "iccid": resultFirstTry.iccid,
                    "number": resultFirstTry.number,
                    "serviceProvider": resultFirstTry.serviceProvider
                };

            if (!pin_second_try)
                return {
                    "dongleFound": true,
                    "pinState": resultFirstTry.pinState,
                    "tryLeft": resultFirstTry.tryLeft
                };

            let resultSecondTry = await attemptUnlock(pin_second_try);

            if (!matchLocked(resultSecondTry))
                return {
                    "dongleFound": true,
                    "pinState": "READY",
                    "iccid": resultSecondTry.iccid,
                    "number": resultSecondTry.number,
                    "serviceProvider": resultSecondTry.serviceProvider
                };

            return {
                "dongleFound": true,
                "pinState": resultSecondTry.pinState,
                "tryLeft": resultSecondTry.tryLeft
            };

        } catch (error) {

            debug("error: ", error.message);

            return { "dongleFound": false };

        }


    };

})();
