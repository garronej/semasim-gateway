"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const apiDeclaration = require("../../sip_api_declarations/gatewayToBackend");
const remoteApi = require("./remoteApiCaller");
const dbAsterisk = require("../dbAsterisk");
exports.handlers = {};
{
    const methodName = apiDeclaration.getDongle.methodName;
    const handler = {
        "handler": ({ imei }) => Promise.resolve(chan_dongle_extended_client_1.DongleController.getInstance().dongles.get(imei))
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.getDongleAndSipPassword.methodName;
    const handler = {
        "handler": ({ imsi }) => __awaiter(this, void 0, void 0, function* () {
            const dongle = Array.from(chan_dongle_extended_client_1.DongleController.getInstance().dongles.values())
                .filter(chan_dongle_extended_client_1.types.Dongle.Usable.match)
                .find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return undefined;
            }
            console.log({ dongle });
            return {
                dongle,
                "sipPassword": yield dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi)
            };
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.unlockSim.methodName;
    const handler = {
        "handler": ({ imei, pin }) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield chan_dongle_extended_client_1.DongleController.getInstance().unlock(imei, pin);
            }
            catch (_a) {
                return undefined;
            }
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.rebootDongle.methodName;
    const handler = {
        "handler": ({ imsi }) => __awaiter(this, void 0, void 0, function* () {
            const dc = chan_dongle_extended_client_1.DongleController.getInstance();
            const dongle = Array.from(dc.usableDongles.values()).find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return { "isSuccess": false };
            }
            try {
                yield chan_dongle_extended_client_1.DongleController.getInstance().rebootDongle(dongle.imei);
            }
            catch (_b) {
                return { "isSuccess": false };
            }
            return { "isSuccess": true };
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    let handler = {
        "handler": ({ imsi }) => __awaiter(this, void 0, void 0, function* () {
            let dc = chan_dongle_extended_client_1.DongleController.getInstance();
            let dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (dongle) {
                remoteApi.notifySimOnline(dongle);
            }
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.createContact.methodName;
    const handler = {
        "handler": ({ imsi, name, number }) => __awaiter(this, void 0, void 0, function* () {
            const dc = chan_dongle_extended_client_1.DongleController.getInstance();
            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return undefined;
            }
            let contact;
            try {
                contact = yield dc.createContact(imsi, number, name);
            }
            catch (_c) {
                return undefined;
            }
            return {
                "mem_index": contact.index,
                "name_as_stored": contact.name,
                "new_storage_digest": dongle.sim.storage.digest
            };
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.updateContactName.methodName;
    const handler = {
        "handler": ({ imsi, mem_index, newName }) => __awaiter(this, void 0, void 0, function* () {
            const dc = chan_dongle_extended_client_1.DongleController.getInstance();
            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return undefined;
            }
            let contact;
            try {
                contact = yield dc.updateContact(imsi, mem_index, newName, undefined);
            }
            catch (_d) {
                return undefined;
            }
            return {
                "new_name_as_stored": contact.name,
                "new_storage_digest": dongle.sim.storage.digest
            };
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.deleteContact.methodName;
    const handler = {
        "handler": ({ imsi, mem_index }) => __awaiter(this, void 0, void 0, function* () {
            const dc = chan_dongle_extended_client_1.DongleController.getInstance();
            const dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return undefined;
            }
            try {
                yield dc.deleteContact(imsi, mem_index);
            }
            catch (_e) {
                return undefined;
            }
            return { "new_storage_digest": dongle.sim.storage.digest };
        })
    };
    exports.handlers[methodName] = handler;
}
