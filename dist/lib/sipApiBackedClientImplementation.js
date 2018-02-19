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
const sipApi_1 = require("./sipApi");
const sipProxy_1 = require("./sipProxy");
const db = require("./db");
const dbAsterisk = require("./dbAsterisk");
const sipProxy = require("./sipProxy");
function init(backendSocket) {
    new sipApi_1.protocol.Client(backendSocket);
}
exports.init = init;
function getClient() {
    return __awaiter(this, void 0, void 0, function* () {
        return sipApi_1.protocol.Client.getFromSocket(yield sipProxy_1.getBackendSocket());
    });
}
function sendRequest(methodName, params, retry) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            response = yield (yield getClient()).sendRequest(methodName, params, 5 * 1000);
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
function notifySimOnline(dongle) {
    (() => __awaiter(this, void 0, void 0, function* () {
        let methodName = sipApi_1.backendDeclaration.notifySimOnline.methodName;
        let params = {
            "imsi": dongle.sim.imsi,
            "storageDigest": dongle.sim.storage.digest,
            "password": yield dbAsterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi),
            "simDongle": {
                "imei": dongle.imei,
                "isVoiceEnabled": dongle.isVoiceEnabled,
                "manufacturer": dongle.manufacturer,
                "model": dongle.model,
                "firmwareVersion": dongle.firmwareVersion
            }
        };
        let response;
        try {
            response = yield sendRequest(methodName, params);
        }
        catch (_a) {
            return;
        }
        if (response.status === "NEED PASSWORD RENEWAL") {
            sipProxy.flushRegistrations(dongle.sim.imsi);
            db.removeUaSim(dongle.sim.imsi, response.allowedUas);
            params.password = yield dbAsterisk.createEndpointIfNeededAndGetPassword(dongle.sim.imsi, "RENEW PASSWORD");
            sendRequest(methodName, params).catch(() => { });
        }
        else if (response.status === "NOT REGISTERED") {
            sipProxy.flushRegistrations(dongle.sim.imsi);
            db.removeUaSim(dongle.sim.imsi);
        }
    }))();
}
exports.notifySimOnline = notifySimOnline;
function notifySimOffline(imsi) {
    let methodName = sipApi_1.backendDeclaration.notifySimOffline.methodName;
    let params = { imsi };
    sendRequest(methodName, params).catch(() => { });
}
exports.notifySimOffline = notifySimOffline;
//TODO: to remove ua should be added on connection
function notifyNewOrUpdatedUa(ua) {
    let methodName = sipApi_1.backendDeclaration.notifyNewOrUpdatedUa.methodName;
    let params = ua;
    sendRequest(methodName, params).catch(() => { });
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
    let methodName = sipApi_1.backendDeclaration.wakeUpContact.methodName;
    let params = { contact };
    return sendRequest(methodName, params, "RETRY");
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
    return __awaiter(this, void 0, void 0, function* () {
        let methodName = sipApi_1.backendDeclaration.forceContactToReRegister.methodName;
        let params = { contact };
        return sendRequest(methodName, params, "RETRY");
    });
}
exports.forceContactToRegister = forceContactToRegister;
