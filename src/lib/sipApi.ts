import { DongleExtendedClient, typesDef as t } from "chan-dongle-extended-client";
import * as framework from "../tools/sipApiFramework";
import * as sipLibrary from "../tools/sipLibrary";
import { asterisk as dbAsterisk } from "./db";
import * as phone from "../tools/phoneNumberLibrary";
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

    function checkIfIccidMatch(iccid: string, last_four_digits_of_iccid: string) {
        return !iccid || iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }

    function readServiceProvider( 
        spFromDongle: string | undefined, 
        imsi: string
    ): string | undefined {

        let imsiInfos = phone.getImsiInfos(imsi);

        if (!imsiInfos) return spFromDongle;

        return imsiInfos.network_name;

    }

    function buildSuccessResponse(dongle: t.DongleActive): Response {

        return {
            "dongleFound": true,
            "pinState": "READY",
            "iccid": dongle.iccid,
            "number": phone.toNationalNumber(
                dongle.number || "",
                dongle.imsi
            ),
            "serviceProvider": readServiceProvider(
                dongle.serviceProvider,
                dongle.imsi
            )
        };

    }

    function buildDongleStillLockedResponse(dongle: t.LockedDongle): Response {

        return {
            "dongleFound": true,
            "pinState": dongle.pinState,
            "tryLeft": dongle.tryLeft
        };

    }

    async function attemptUnlock(
        imei: string, 
        pin: string
    ): Promise<t.LockedDongle | t.DongleActive> {

        let dongleClient= DongleExtendedClient.localhost();

        await dongleClient.unlockDongle(imei, pin);

        return await Promise.race([
            dongleClient.evtNewActiveDongle.waitFor(newActiveDongle => newActiveDongle.imei === imei),
            dongleClient.evtRequestUnlockCode.waitFor(lockedDongle => lockedDongle.imei === imei)
        ]);

    };

    const matchUnlocked = (dongle: t.LockedDongle | t.DongleActive): dongle is t.DongleActive => !(dongle as t.LockedDongle).pinState;

    handlers[methodName] = async (params: Params): Promise<Response> => {

        debug(`handle ${methodName}`);

        let { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try } = params;

        let dongleClient = DongleExtendedClient.localhost();

        try {

            let activeDongle = await dongleClient.getActiveDongle(imei);

            if (activeDongle) {

                if (!checkIfIccidMatch(activeDongle.iccid, last_four_digits_of_iccid))
                    throw new Error("ICCID does not match");

                return buildSuccessResponse(activeDongle);

            }

            let lockedDongle: t.LockedDongle | undefined = undefined;

            let lockedDongles = await dongleClient.getLockedDongles();

            for (let i = 0; i < lockedDongles.length; i++) {

                if (lockedDongles[i].imei !== imei)
                    continue;

                if (!checkIfIccidMatch(lockedDongles[i].iccid, last_four_digits_of_iccid))
                    continue;

                lockedDongle = lockedDongles[i];

                break;

            }

            if (!lockedDongle) throw new Error("Locked dongle not found");

            if (lockedDongle.pinState !== "SIM PIN" || lockedDongle.tryLeft !== 3 || !pin_first_try)
                return buildDongleStillLockedResponse(lockedDongle);

            let dongleFirstTry = await attemptUnlock(imei, pin_first_try);

            if (matchUnlocked(dongleFirstTry))
                return buildSuccessResponse(dongleFirstTry);

            if (!pin_second_try)
                return buildDongleStillLockedResponse(dongleFirstTry);

            let dongleSecondTry = await attemptUnlock(imei, pin_second_try);

            if (matchUnlocked(dongleSecondTry))
                return buildSuccessResponse(dongleSecondTry);

            return buildDongleStillLockedResponse(dongleSecondTry);

        } catch (error) {

            debug("error: ", error.message);

            return { "dongleFound": false };

        }


    };

})();


(() => {

    let methodName = _.getSimPhonebook.methodName;
    type Params = _.getSimPhonebook.Params;
    type Response = _.getSimPhonebook.Response;

    handlers[methodName] = async (params: Params): Promise<Response> => {

        debug(`handle ${methodName}`);

        let { iccid } = params;

        let dongleClient = DongleExtendedClient.localhost();

        try {

            let [{ imei, imsi }] = (await dongleClient.getActiveDongles())
                .filter(dongle => dongle.iccid === iccid)
                .map(({ imei, imsi }) => ({ imei, imsi }));

            let phonebook = await dongleClient.getSimPhonebook(imei);

            for (let contact of phonebook.contacts){
                if( !contact.name || !contact.number ) continue;
                contact.number = phone.toNationalNumber(contact.number, imsi);
            }

            return phonebook;

        } catch (error) {

            return { "errorMessage": error.message };

        }

    };

})();
