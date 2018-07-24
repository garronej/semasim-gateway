import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import * as apiDeclaration from "../../../sip_api_declarations/backendSocket";
import * as sipLibrary from "ts-sip";
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

            //TODO check is dongle locked or at least return undefined when status disconnect

            try {

                return await Dc.getInstance().unlock(imei, pin);


            } catch{

                return undefined;

            }

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi }) => {

            const dc= Dc.getInstance();

            const dongle = Array.from(dc.usableDongles.values()).find(({ sim })=> sim.imsi === imsi);

            if( !dongle ){

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

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
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

})();

(() => {

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
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

})();

(() => {

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
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

})();

