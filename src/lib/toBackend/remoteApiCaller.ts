
import * as sip from "ts-sip";
import * as apiDeclaration from "../../sip_api_declarations/backendToGateway";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types from "../types";
import * as backendConnection from "../toBackend/connection";
import * as dbAsterisk from "../dbAsterisk";
import * as dbSemasim from "../dbSemasim";
import * as sipContactsMonitor from "../sipContactsMonitor";

export const notifySimOnline = (() => {

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    return async function (dongle: dcTypes.Dongle.Usable): Promise<void> {

        const { imsi } = dongle.sim;

        const replacementPassword = dbAsterisk.generateSipEndpointPassword();

        const response = await sendRequest<Params, Response>(
            methodName,
            {
                imsi,
                "storageDigest": dongle.sim.storage.digest,
                "password": await dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi),
                replacementPassword,
                "towardSimEncryptKeyStr": (await dbSemasim.getTowardSimKeys(imsi))!.encryptKeyStr,
                "simDongle": {
                    "imei": dongle.imei,
                    "isVoiceEnabled": dongle.isVoiceEnabled,
                    "manufacturer": dongle.manufacturer,
                    "model": dongle.model,
                    "firmwareVersion": dongle.firmwareVersion
                },
                "isGsmConnectivityOk": dongle.isGsmConnectivityOk,
                "cellSignalStrength": dongle.cellSignalStrength
            }
        ).catch(() => undefined);

        if (!response) {
            return;
        }

        switch (response.status) {
            case "OK": break;
            case "NOT REGISTERED":

                sipContactsMonitor.discardContactsRegisteredToSim(imsi, "sim is no longer registered by any user");

                dbSemasim.removeUaSim(imsi);

                break;
            case "REPLACE PASSWORD":

                sipContactsMonitor.discardContactsRegisteredToSim(
                    imsi,
                    "need password renewal"
                );

                dbSemasim.removeUaSim(imsi, response.allowedUas);

                dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi, replacementPassword);

                break;
        }

    };

})();


export const notifyGsmConnectivityChange = (() => {

    const { methodName } = apiDeclaration.notifyGsmConnectivityChange;
    type Params = apiDeclaration.notifyGsmConnectivityChange.Params;
    type Response = apiDeclaration.notifyGsmConnectivityChange.Response;

    return async function (imsi: string, isGsmConnectivityOk: boolean): Promise<void> {

        await sendRequest<Params, Response>(
            methodName,
            { imsi, isGsmConnectivityOk }
        ).catch(() => { });

    };

})();

export const notifyCellSignalStrengthChange = (() => {

    const { methodName } = apiDeclaration.notifyCellSignalStrengthChange;
    type Params = apiDeclaration.notifyCellSignalStrengthChange.Params;
    type Response = apiDeclaration.notifyCellSignalStrengthChange.Response;

    return async function (imsi: string, cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength): Promise<void> {

        await sendRequest<Params, Response>(
            methodName,
            { imsi, cellSignalStrength }
        ).catch(() => { });

    };

})();


export const notifyLockedDongle = (() => {

    const methodName = apiDeclaration.notifyLockedDongle.methodName;
    type Params = apiDeclaration.notifyLockedDongle.Params;
    type Response = apiDeclaration.notifyLockedDongle.Response;

    return async function (dongle: dcTypes.Dongle.Locked): Promise<void> {

        await sendRequest<Params, Response>(
            methodName,
            dongle
        ).catch(() => { });

    };

})();

export const notifyDongleOffline = (() => {

    const methodName = apiDeclaration.notifyDongleOffline.methodName;
    type Params = apiDeclaration.notifyDongleOffline.Params;
    type Response = apiDeclaration.notifyDongleOffline.Response;

    return async function (dongle: dcTypes.Dongle): Promise<void> {

        await sendRequest<Params, Response>(
            methodName,
            dcTypes.Dongle.Locked.match(dongle) ?
                { "imei": dongle.imei } :
                { "imsi": dongle.sim.imsi }
        ).catch(() => { });

    };

})();

export const notifyOngoingCall = (() => {

    const { methodName } = apiDeclaration.notifyOngoingCall;
    type Params = apiDeclaration.notifyOngoingCall.Params;
    type Response = apiDeclaration.notifyOngoingCall.Response;

    return async function (params: Params): Promise<void> {

        await sendRequest<Params, Response>(
            methodName,
            params
        ).catch(() => { });

    };

})();

export const seeIfSipContactIsReachableElseSendWakeUpPushNotification = (() => {

    const { methodName } = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification;
    type Params = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification.Params;
    type Response = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification.Response;

    return (contact: types.Contact) => sendRequest<Params, Response>(
        methodName,
        contact
    );

})();

export const sendWakeUpPushNotifications = (() => {

    const { methodName } = apiDeclaration.sendWakeUpPushNotifications;
    type Params = apiDeclaration.sendWakeUpPushNotifications.Params;
    type Response = apiDeclaration.sendWakeUpPushNotifications.Response;

    return async ({ uas, imsi }: Params) => {

        if (uas.length === 0) {
            return;
        }

        await sendRequest<Params, Response>(
            methodName,
            { uas, imsi },
            "RETRY"
        );

    }

})();

async function sendRequest<Params, Response>(
    methodName: string,
    params: Params,
    retry: false | "RETRY" = false
): Promise<Response> {

    let response: Response;

    try {

        response = await sip.api.client.sendRequest<Params, Response>(
            await backendConnection.get(),
            methodName,
            params,
            { "timeout": 5 * 1000 }
        );

    } catch (error) {


        if (!!retry) {

            //NOTE: Only retry once. If it's a connection problem
            //this will likely be solved by resending the request,
            //if there is really a problem with the request altho
            //it should not happen as the client is supposed to be 
            //always up to date let's not flood the backend.
            return sendRequest<Params, Response>(
                methodName,
                params,
                false
            );

        } else {

            throw error;

        }

    }

    return response;

}
