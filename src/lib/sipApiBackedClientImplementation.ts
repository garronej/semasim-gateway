import { backendDeclaration as apiDeclaration, protocol } from "../sipApi";
import { getBackendSocket } from "./sipProxy";
import * as sipLibrary from "../tools/sipLibrary";
import * as db from "./db";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact } from "../lib/sipContact";

export function init(backendSocket: sipLibrary.Socket){

    new protocol.Client(backendSocket, 3600 * 1000);

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
    dongle: Dc.ActiveDongle
) {

    (async () => {

        let methodName = apiDeclaration.notifySimOnline.methodName;

        let params: apiDeclaration.notifySimOnline.Params = {
            "imsi": dongle.sim.imsi,
            "isVoiceEnabled": dongle.isVoiceEnabled,
            "storageDigest": dongle.sim.storage.digest,
            "password": await db.asterisk.createEndpointIfNeededAndGetPassword(
                dongle.sim.imsi
            )
        };

        let response: apiDeclaration.notifySimOnline.Response;

        try {

            response = await sendRequest(methodName, params);

        } catch{

            return;

        }

        if (response.status === "NEED PASSWORD RENEWAL") {

            db.semasim.removeUaSim(dongle.sim.imsi, response.allowedUas);

            params.password = await db.asterisk.createEndpointIfNeededAndGetPassword(
                dongle.sim.imsi, "RENEW PASSWORD"
            );

            sendRequest(methodName, params).catch(() => { });

        } else if (response.status === "NOT REGISTERED") {

            db.semasim.removeUaSim(dongle.sim.imsi);

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
    ua: Contact.UaSim.Ua
) {

    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;

    let params: apiDeclaration.notifyNewOrUpdatedUa.Params = ua;

    sendRequest(
        methodName,
        params
    ).catch(() => { });

}

export function wakeUpContact(
    contact: Contact
): Promise<apiDeclaration.wakeUpContact.Response> {

    let methodName = apiDeclaration.wakeUpContact.methodName;

    let params: apiDeclaration.wakeUpContact.Params = { contact };

    return sendRequest(methodName, params, "RETRY");

}

export async function forceContactToRegister(
    contact: Contact
): Promise<apiDeclaration.forceContactToReRegister.Response> {

    let methodName = apiDeclaration.forceContactToReRegister.methodName;

    let params: apiDeclaration.forceContactToReRegister.Params = { contact };

    return sendRequest(methodName, params, "RETRY");

}
