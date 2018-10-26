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
const dbSemasim = require("./dbSemasim");
const misc = require("./misc");
const logger = require("logger");
const sipContactsMonitor = require("./sipContactsMonitor");
const backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
const sipMessagesMonitor = require("./sipMessagesMonitor");
const debug = logger.debugFactory();
function sendMessagesOfDongle(dongle) {
    sendMessagesOfDongle.lock.acquire(dongle.imei, () => __awaiter(this, void 0, void 0, function* () {
        const dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (let [message, { onSent, onStatusReport }] of yield dbSemasim.getUnsentMessagesTowardGsm(dongle.sim.imsi)) {
            let sendMessageResult;
            try {
                //TODO: Dial with the number it was guessed from.
                sendMessageResult = yield dc.sendMessage(dongle.imei, message.toNumber, message.text);
            }
            catch (_a) {
                return;
            }
            let sendDate = sendMessageResult.success ?
                sendMessageResult.sendDate : null;
            onSent(sendDate).then(() => notifyNewSipMessagesToSend(dongle.sim.imsi));
            if (!sendMessageResult.success) {
                debug("Dongle send error".red, { sendMessageResult });
                if (sendMessageResult.reason === "DISCONNECT") {
                    return;
                }
                else {
                    continue;
                }
            }
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
        for (const contact of sipContactsMonitor.getContacts(imsi)) {
            if (!(yield dbSemasim.messageTowardSipUnsentCount(contact.uaSim))) {
                continue;
            }
            if ((yield backendRemoteApiCaller.wakeUpContact(contact))
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
    sendMessagesOfContact.lock.acquire(misc.generateUaSimId(contact.uaSim), () => __awaiter(this, void 0, void 0, function* () {
        for (let [message, onReceived] of yield dbSemasim.getUnsentMessagesTowardSip(contact.uaSim)) {
            try {
                yield sipMessagesMonitor.sendMessage(contact, message.fromNumber, misc.smuggleBundledDataInHeaders(message.bundledData), message.text);
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
