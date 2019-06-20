
import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import * as apiDeclaration from "../../sip_api_declarations/gatewayToBackend";
import * as sip from "ts-sip";
import * as remoteApi from "./remoteApiCaller";
import * as dbAsterisk from "../dbAsterisk";
import * as dbSemasim from "../dbSemasim";

export const handlers: sip.api.Server.Handlers = {};

{

    const methodName = apiDeclaration.getDongle.methodName;
    type Params = apiDeclaration.getDongle.Params;
    type Response = apiDeclaration.getDongle.Response;

    const handler: sip.api.Server.Handler<Params, Response>= {
        "handler": ({ imei })=> Promise.resolve(
            Dc.getInstance().dongles.get(imei)
        )
    };

    handlers[methodName]= handler;

}

{

    const methodName = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.methodName;
    type Params = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.Params;
    type Response = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi }) => {

            const dongle = Array.from(Dc.getInstance().dongles.values())
                .filter(dcTypes.Dongle.Usable.match)
                .find(({ sim }) => sim.imsi === imsi)
                ;

            if (!dongle) {
                return undefined;
            }

            const [ sipPassword, { encryptKeyStr: towardSimEncryptKeyStr }] = await Promise.all([
                     dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi),
                    dbSemasim.getTowardSimKeys(imsi).then(out=> out!)
            ]);

            return { dongle, sipPassword, towardSimEncryptKeyStr };
        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.unlockSim.methodName;
    type Params = apiDeclaration.unlockSim.Params;
    type Response = apiDeclaration.unlockSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imei, pin }) => {

            try {

                return await Dc.getInstance().unlock(imei, pin);

            } catch{

                return undefined;

            }

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi }) => {

            const dc = Dc.getInstance();

            const dongle = Array.from(
                dc.usableDongles.values()
            ).find(({ sim }) => sim.imsi === imsi);

            if (!dongle) {

                return { "isSuccess": false };

            }

            try {

                await Dc.getInstance().rebootDongle(dongle.imei);

            } catch{

                return { "isSuccess": false };

            }

            return { "isSuccess": true };

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let handler: sip.api.Server.Handler<Params, Response> = {
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

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, name, number }) => {

            const dc = Dc.getInstance();

            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);

            if (!dongle) {
                return undefined;
            }

            let contact: dcTypes.Sim.Contact;

            try {

                contact = await dc.createContact(imsi, number, name)

            } catch{

                return undefined;

            }

            return {
                "mem_index": contact.index,
                "name_as_stored": contact.name,
                "new_storage_digest": dongle.sim.storage.digest
            };

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, mem_index, newName }) => {

            const dc = Dc.getInstance();

            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);

            if (!dongle) {
                return undefined;
            }

            let contact: dcTypes.Sim.Contact;

            try {

                contact = await dc.updateContact(imsi, mem_index, newName, undefined);

            } catch{

                return undefined;

            }

            return {
                "new_name_as_stored": contact.name,
                "new_storage_digest": dongle.sim.storage.digest
            };

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, mem_index }) => {

            const dc = Dc.getInstance();

            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);

            if (!dongle) {
                return undefined;
            }

            try {

                await dc.deleteContact(imsi, mem_index);

            } catch{

                return undefined;

            }

            return { "new_storage_digest": dongle.sim.storage.digest };

        }
    };

    handlers[methodName] = handler;

}

