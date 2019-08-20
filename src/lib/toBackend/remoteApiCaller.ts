
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

                sipContactsMonitor.discardContactsRegisteredToSim(imsi);

                dbSemasim.removeUaSim(imsi);

                break;
            case "REPLACE PASSWORD":

                sipContactsMonitor.discardContactsRegisteredToSim(imsi);

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

export const notifyNewOrUpdatedUa = (() => {

    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    type Params = apiDeclaration.notifyNewOrUpdatedUa.Params;
    type Response = apiDeclaration.notifyNewOrUpdatedUa.Response;

    return async function (ua: types.Ua): Promise<void> {

        //TODO: See if we really need to return that promise that never resolve
        await sendRequest<Params, Response>(methodName, ua)
            .catch(() => new Promise(() => { }));

    };


})();

export const wakeUpContact = (() => {

    let methodName = apiDeclaration.wakeUpContact.methodName;
    type Params = apiDeclaration.wakeUpContact.Params;
    type Response = apiDeclaration.wakeUpContact.Response;

    /**
     * 
     * To use when we want to send a message or make a call
     * backend will try to reach the contact with a qualify
     * if the contact does not respond a push notification
     * will be sent.
     * 
     * TODO: add contextual infos about the call or the message
     * in the notification so web notification can be displayed.
     * 
     */
    return function (contact: types.Contact): Promise<Response> {

        //TODO: See if we really need to return that promise that never resolve
        return sendRequest<Params, Response>(methodName, { contact })
            .catch(() => new Promise<Response>(() => { }));

    };

})();

export const forceContactToRegister = (() => {

    let methodName = apiDeclaration.forceContactToReRegister.methodName;
    type Params = apiDeclaration.forceContactToReRegister.Params;
    type Response = apiDeclaration.forceContactToReRegister.Response;

    /**
     * 
     * To use when the contact has expired to make it re register
     * with a new connection.
     * No push notification will be sent to this ua until it re-register.
     * 
     * The contact has to expire or we will keep sending push notifications
     * for ever to UA that can be no longer active ( e.g uninstalled app )
     * 
     * NOTE: Web UA should never expire as it may only have one ua
     * by sim so we do not keep sending push notification 
     * 
     * NOTE: this push notification should not have any content
     * 
     */
    return function (contact: types.Contact): Promise<boolean> {

        return sendRequest<Params, Response>(
            methodName,
            { contact },
            "RETRY"
        );

    };


})();

async function sendRequest<Params, Response>(
    methodName: string,
    params: Params,
    retry: false | "RETRY" = false
): Promise<Response> {

    let response;

    try {

        response = await sip.api.client.sendRequest<Params, Response>(
            await backendConnection.get(),
            methodName,
            params,
            { "timeout": 5 * 1000 }
        );

    } catch (error) {

        if (!!retry) {

            return sendRequest<Params, Response>(
                methodName,
                params,
                "RETRY"
            );

        } else {

            throw error;

        }

    }

    return response;

}
