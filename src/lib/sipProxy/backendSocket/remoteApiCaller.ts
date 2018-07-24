import * as sipLibrary from "ts-sip";
import * as apiDeclaration from "../../../sip_api_declarations/gatewaySockets";
import * as db from "../../db";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types from "../../types";
import * as backendSocket from "./store";
import * as contactRegistrationMonitor from "../contactsRegistrationMonitor";

export function notifySimOnline(
    dongle: dcTypes.Dongle.Usable
) {

    (async () => {

        let methodName = apiDeclaration.notifySimOnline.methodName;
        type Params = apiDeclaration.notifySimOnline.Params;
        type Response = apiDeclaration.notifySimOnline.Response;

        let params: Params = {
            "imsi": dongle.sim.imsi,
            "storageDigest": dongle.sim.storage.digest,
            "password": await db.asterisk.createEndpointIfNeededAndGetPassword(
                dongle.sim.imsi
            ),
            "simDongle": {
                "imei": dongle.imei,
                "isVoiceEnabled": dongle.isVoiceEnabled,
                "manufacturer": dongle.manufacturer,
                "model": dongle.model,
                "firmwareVersion": dongle.firmwareVersion
            }
        };

        try {

            var response = await sendRequest<Params, Response>(
                methodName, params
            );

        } catch{

            return;

        }

        if (response.status === "NEED PASSWORD RENEWAL") {

            contactRegistrationMonitor.discardContactsRegisteredToSim(dongle.sim.imsi);

            db.semasim.removeUaSim(dongle.sim.imsi, response.allowedUas);

            params.password = await db.asterisk.createEndpointIfNeededAndGetPassword(
                dongle.sim.imsi, "RENEW PASSWORD"
            );

            //This should enforce allowed ua to re-register
            sendRequest<Params, Response>(methodName, params).catch(() => { });

        } else if (response.status === "NOT REGISTERED") {

            contactRegistrationMonitor.discardContactsRegisteredToSim(dongle.sim.imsi);

            db.semasim.removeUaSim(dongle.sim.imsi);

        }

    })();

}

export function notifySimOffline(
    imsi: string
) {

    let methodName = apiDeclaration.notifySimOffline.methodName;
    type Params = apiDeclaration.notifySimOffline.Params;
    type Response = apiDeclaration.notifySimOffline.Response;

    sendRequest<Params, Response>(methodName, { imsi })
        .catch(() => { });

}


//TODO: to remove ua should be added on connection
export async function notifyNewOrUpdatedUa(
    ua: types.Ua
): Promise<void> {

    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    type Params = apiDeclaration.notifyNewOrUpdatedUa.Params;
    type Response = apiDeclaration.notifyNewOrUpdatedUa.Response;

    try {

        await sendRequest<Params, Response>(methodName, ua)

    } catch{

        return new Promise<void>(resolve => { });

    }

}

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
export async function wakeUpContact(
    contact: types.Contact
) {

    let methodName = apiDeclaration.wakeUpContact.methodName;
    type Params = apiDeclaration.wakeUpContact.Params;
    type Response = apiDeclaration.wakeUpContact.Response;

    try {

        return await sendRequest<Params, Response>(
            methodName,
            { contact }
        );

    } catch{

        return new Promise<Response>(resolve => { });

    }

}

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
export function forceContactToRegister(
    contact: types.Contact
) {

    let methodName = apiDeclaration.forceContactToReRegister.methodName;
    type Params = apiDeclaration.forceContactToReRegister.Params;
    type Response = apiDeclaration.forceContactToReRegister.Response;

    return sendRequest<Params, Response>(
        methodName,
        { contact },
        "RETRY"
    );

}


async function sendRequest<Params, Response>(
    methodName: string,
    params: Params,
    retry?: "RETRY"
): Promise<Response> {

    let response;

    try {

        response = sipLibrary.api.client.sendRequest<Params, Response>(
            await backendSocket.get(),
            methodName,
            params,
            { "timeout": 5 * 1000 }
        );

    } catch (error) {

        if (retry) {

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