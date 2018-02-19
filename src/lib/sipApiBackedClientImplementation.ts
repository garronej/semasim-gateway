import { backendDeclaration as apiDeclaration, protocol } from "./sipApi";
import { getBackendSocket } from "./sipProxy";
import * as sipLibrary from "../tools/sipLibrary";
import * as db from "./db";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types  from "./types";
import * as dbAsterisk from "./dbAsterisk";
import * as sipProxy from "./sipProxy";

export function init(backendSocket: sipLibrary.Socket){

    new protocol.Client(backendSocket);

}

async function getClient(): Promise<protocol.Client> {

    return protocol.Client.getFromSocket(await getBackendSocket());

}

async function sendRequest(
    methodName: string,
    params: any,
    retry?: "RETRY"
): Promise<any> {

    let response;

    try{

        response= await (await getClient()).sendRequest(
            methodName, 
            params, 
            5*1000
        );

    }catch(error){

        if( retry ){

            return sendRequest(methodName, params, "RETRY");

        }else{

            throw error;

        }

    }

    return response;

}

export function notifySimOnline(
    dongle: dcTypes.Dongle.Usable
) {

    (async () => {

        let methodName = apiDeclaration.notifySimOnline.methodName;

        let params: apiDeclaration.notifySimOnline.Params = {
            "imsi": dongle.sim.imsi,
            "storageDigest": dongle.sim.storage.digest,
            "password": await dbAsterisk.createEndpointIfNeededAndGetPassword(
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

        let response: apiDeclaration.notifySimOnline.Response;

        try {

            response = await sendRequest(methodName, params);

        } catch{

            return;

        }

        if (response.status === "NEED PASSWORD RENEWAL") {

            sipProxy.flushRegistrations(dongle.sim.imsi);

            db.removeUaSim(dongle.sim.imsi, response.allowedUas);

            params.password = await dbAsterisk.createEndpointIfNeededAndGetPassword(
                dongle.sim.imsi, "RENEW PASSWORD"
            );

            sendRequest(methodName, params).catch(() => { });

        } else if (response.status === "NOT REGISTERED") {

            sipProxy.flushRegistrations(dongle.sim.imsi);

            db.removeUaSim(dongle.sim.imsi);

        }

    })();

}

export function notifySimOffline(
    imsi: string
) {

    let methodName = apiDeclaration.notifySimOffline.methodName;

    let params: apiDeclaration.notifySimOffline.Params = { imsi };

    sendRequest(
        methodName,
        params
    ).catch(() => { });

}


//TODO: to remove ua should be added on connection
export function notifyNewOrUpdatedUa(
    ua: types.Ua
) {

    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;

    let params: apiDeclaration.notifyNewOrUpdatedUa.Params = ua;

    sendRequest(
        methodName,
        params
    ).catch(() => { });

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
export function wakeUpContact(
    contact: types.Contact
): Promise<apiDeclaration.wakeUpContact.Response> {

    let methodName = apiDeclaration.wakeUpContact.methodName;

    let params: apiDeclaration.wakeUpContact.Params = { contact };

    return sendRequest(methodName, params, "RETRY");

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
export async function forceContactToRegister(
    contact: types.Contact
): Promise<apiDeclaration.forceContactToReRegister.Response> {

    let methodName = apiDeclaration.forceContactToReRegister.methodName;

    let params: apiDeclaration.forceContactToReRegister.Params = { contact };

    return sendRequest(methodName, params, "RETRY");

}
