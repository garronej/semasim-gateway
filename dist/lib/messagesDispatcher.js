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
const AsyncLock = require("async-lock");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const db = require("./db/semasim");
const sipProxy = require("./sipProxy");
const types = require("./types");
const _debug = require("debug");
let debug = _debug("_messageDispatcher");
function sendMessagesOfDongle(dongle) {
    sendMessagesOfDongle.lock.acquire(dongle.imei, () => __awaiter(this, void 0, void 0, function* () {
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (let [message, { onSent, onStatusReport }] of yield db.getUnsentMessagesTowardGsm(dongle.sim.imsi)) {
            let sendMessageResult;
            try {
                sendMessageResult = yield dc.sendMessage(dongle.imei, message.toNumber, message.text);
            }
            catch (_a) {
                return;
            }
            if (!sendMessageResult.success) {
                if (sendMessageResult.reason === "DISCONNECT") {
                    return;
                }
                else {
                    yield onSent(null);
                    continue;
                }
            }
            let { sendDate } = sendMessageResult;
            onSent(sendDate)
                .then(() => notifyNewSipMessagesToSend(dongle.sim.imsi));
            dc.evtStatusReport.attachOnce(({ statusReport }) => statusReport.sendDate.getTime() === sendDate.getTime(), ({ statusReport }) => onStatusReport(statusReport)
                .then(() => notifyNewSipMessagesToSend(dongle.sim.imsi)));
        }
    }));
}
exports.sendMessagesOfDongle = sendMessagesOfDongle;
(function (sendMessagesOfDongle) {
    sendMessagesOfDongle.lock = new AsyncLock();
})(sendMessagesOfDongle = exports.sendMessagesOfDongle || (exports.sendMessagesOfDongle = {}));
function notifyNewSipMessagesToSend(imsi) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let contact of sipProxy.asteriskSockets.getContacts(imsi)) {
            if (!(yield db.messageTowardSipUnsentCount(contact.uaSim))) {
                continue;
            }
            if ((yield sipProxy.backendSocket.remoteApi.wakeUpContact(contact))
                ===
                    "REACHABLE") {
                sendMessagesOfContact(contact);
            }
        }
    });
}
exports.notifyNewSipMessagesToSend = notifyNewSipMessagesToSend;
/** Assert contact reachable  */
function sendMessagesOfContact(contact) {
    sendMessagesOfContact.lock.acquire(types.misc.generateUaSimId(contact.uaSim), () => __awaiter(this, void 0, void 0, function* () {
        for (let [message, onReceived] of yield db.getUnsentMessagesTowardSip(contact.uaSim)) {
            try {
                yield sipProxy.messages.sendMessage(contact, message.fromNumber, types.misc.smuggleBundledDataInHeaders(message.bundledData), message.text);
            }
            catch (error) {
                debug("sip Send Message error:", error.message);
                return;
            }
            onReceived();
        }
    }));
}
exports.sendMessagesOfContact = sendMessagesOfContact;
(function (sendMessagesOfContact) {
    sendMessagesOfContact.lock = new AsyncLock();
})(sendMessagesOfContact = exports.sendMessagesOfContact || (exports.sendMessagesOfContact = {}));
