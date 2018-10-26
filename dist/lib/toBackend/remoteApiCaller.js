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
const sip = require("ts-sip");
const apiDeclaration = require("../../sip_api_declarations/backendToGateway");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const backendConnection = require("../toBackend/connection");
const dbAsterisk = require("../dbAsterisk");
const dbSemasim = require("../dbSemasim");
const sipContactsMonitor = require("../sipContactsMonitor");
exports.notifySimOnline = (() => {
    const methodName = apiDeclaration.notifySimOnline.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function* () {
            const password = yield dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(dongle.sim.imsi);
            const replacementPassword = dbAsterisk.generateSipEndpointPassword();
            const response = yield sendRequest(methodName, {
                "imsi": dongle.sim.imsi,
                "storageDigest": dongle.sim.storage.digest,
                password,
                replacementPassword,
                "simDongle": {
                    "imei": dongle.imei,
                    "isVoiceEnabled": dongle.isVoiceEnabled,
                    "manufacturer": dongle.manufacturer,
                    "model": dongle.model,
                    "firmwareVersion": dongle.firmwareVersion
                }
            }).catch(() => undefined);
            if (!response) {
                return;
            }
            switch (response.status) {
                case "OK": break;
                case "NOT REGISTERED":
                    sipContactsMonitor.discardContactsRegisteredToSim(dongle.sim.imsi);
                    dbSemasim.removeUaSim(dongle.sim.imsi);
                    break;
                case "REPLACE PASSWORD":
                    sipContactsMonitor.discardContactsRegisteredToSim(dongle.sim.imsi);
                    dbSemasim.removeUaSim(dongle.sim.imsi, response.allowedUas);
                    dbAsterisk.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(dongle.sim.imsi, replacementPassword);
            }
        });
    };
})();
exports.notifyLockedDongle = (() => {
    const methodName = apiDeclaration.notifyLockedDongle.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function* () {
            yield sendRequest(methodName, dongle).catch(() => { });
        });
    };
})();
exports.notifyDongleOffline = (() => {
    const methodName = apiDeclaration.notifyDongleOffline.methodName;
    return function (dongle) {
        return __awaiter(this, void 0, void 0, function* () {
            yield sendRequest(methodName, chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle) ?
                { "imei": dongle.imei } :
                { "imsi": dongle.sim.imsi }).catch(() => { });
        });
    };
})();
exports.notifyNewOrUpdatedUa = (() => {
    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    return function (ua) {
        return __awaiter(this, void 0, void 0, function* () {
            //TODO: See if we really need to return that promise that never resolve
            yield sendRequest(methodName, ua)
                .catch(() => new Promise(() => { }));
        });
    };
})();
exports.wakeUpContact = (() => {
    let methodName = apiDeclaration.wakeUpContact.methodName;
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
    return function (contact) {
        //TODO: See if we really need to return that promise that never resolve
        return sendRequest(methodName, { contact })
            .catch(() => new Promise(() => { }));
    };
})();
exports.forceContactToRegister = (() => {
    let methodName = apiDeclaration.forceContactToReRegister.methodName;
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
    return function (contact) {
        return sendRequest(methodName, { contact }, "RETRY");
    };
})();
function sendRequest(methodName, params, retry = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            response = yield sip.api.client.sendRequest(yield backendConnection.get(), methodName, params, { "timeout": 5 * 1000 });
        }
        catch (error) {
            if (!!retry) {
                return sendRequest(methodName, params, "RETRY");
            }
            else {
                throw error;
            }
        }
        return response;
    });
}
