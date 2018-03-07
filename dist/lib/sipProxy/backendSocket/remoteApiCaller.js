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
const sipLibrary = require("../../../tools/sipLibrary");
const apiDeclaration = require("../../sipApiDeclarations/semasimBackend/gatewaySide/gatewaySockets");
const db = require("../../db");
const backendSocket = require("./store");
const asteriskSockets = require("../asteriskSockets");
function notifySimOnline(dongle) {
    (() => __awaiter(this, void 0, void 0, function* () {
        let methodName = apiDeclaration.notifySimOnline.methodName;
        let params = {
            "imsi": dongle.sim.imsi,
            "storageDigest": dongle.sim.storage.digest,
            "password": yield db.asterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi),
            "simDongle": {
                "imei": dongle.imei,
                "isVoiceEnabled": dongle.isVoiceEnabled,
                "manufacturer": dongle.manufacturer,
                "model": dongle.model,
                "firmwareVersion": dongle.firmwareVersion
            }
        };
        try {
            var response = yield sendRequest(methodName, params);
        }
        catch (_a) {
            return;
        }
        if (response.status === "NEED PASSWORD RENEWAL") {
            asteriskSockets.flush(dongle.sim.imsi);
            db.semasim.removeUaSim(dongle.sim.imsi, response.allowedUas);
            params.password = yield db.asterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi, "RENEW PASSWORD");
            sendRequest(methodName, params).catch(() => { });
        }
        else if (response.status === "NOT REGISTERED") {
            asteriskSockets.flush(dongle.sim.imsi);
            db.semasim.removeUaSim(dongle.sim.imsi);
        }
    }))();
}
exports.notifySimOnline = notifySimOnline;
function notifySimOffline(imsi) {
    let methodName = apiDeclaration.notifySimOffline.methodName;
    sendRequest(methodName, { imsi })
        .catch(() => { });
}
exports.notifySimOffline = notifySimOffline;
//TODO: to remove ua should be added on connection
function notifyNewOrUpdatedUa(ua) {
    let methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    sendRequest(methodName, ua)
        .catch(() => { });
}
exports.notifyNewOrUpdatedUa = notifyNewOrUpdatedUa;
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
function wakeUpContact(contact) {
    return __awaiter(this, void 0, void 0, function* () {
        let methodName = apiDeclaration.wakeUpContact.methodName;
        try {
            return yield sendRequest(methodName, { contact });
        }
        catch (_a) {
            return new Promise(resolve => { });
        }
    });
}
exports.wakeUpContact = wakeUpContact;
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
function forceContactToRegister(contact) {
    let methodName = apiDeclaration.forceContactToReRegister.methodName;
    return sendRequest(methodName, { contact }, "RETRY");
}
exports.forceContactToRegister = forceContactToRegister;
function sendRequest(methodName, params, retry) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            response = sipLibrary.api.Client.getFromSocket(yield backendSocket.get()).sendRequest(methodName, params, { "timeout": 5 * 1000 });
        }
        catch (error) {
            if (retry) {
                return sendRequest(methodName, params, "RETRY");
            }
            else {
                throw error;
            }
        }
        return response;
    });
}
