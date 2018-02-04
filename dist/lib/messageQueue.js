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
const db = require("./db");
const AsyncLock = require("async-lock");
const sipContact_1 = require("./sipContact");
const sipMessage = require("./sipMessage");
const sipProxy = require("./sipProxy");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const _debug = require("debug");
let debug = _debug("_messageQueue");
const checkMark = (new Buffer("e29c94", "hex")).toString("utf8");
const crossMark = (new Buffer("e29d8c", "hex")).toString("utf8");
const lockDongle = new AsyncLock();
function sendMessagesOfDongle(dongle) {
    lockDongle.acquire(dongle.imei, () => __awaiter(this, void 0, void 0, function* () {
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (let [message, { setSent, setStatusReport }] of yield db.semasim.MessageTowardGsm.getUnsent(dongle.sim.imsi)) {
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
                    yield setSent(null);
                    continue;
                }
            }
            let { sendDate } = sendMessageResult;
            let prSetSent = setSent(sendDate);
            db.semasim.MessageTowardSip.add(message.toNumber, checkMark, sendDate, true, {
                "target": "SPECIFIC UA REGISTERED TO SIM",
                "uaSim": message.uaSim
            }).then(() => notifyNewSipMessagesToSend(dongle.sim.imsi));
            dc.evtStatusReport.attachOnce(({ statusReport }) => statusReport.sendDate.getTime() === sendDate.getTime(), ({ statusReport }) => __awaiter(this, void 0, void 0, function* () {
                yield prSetSent;
                setStatusReport(statusReport);
                if (statusReport.isDelivered) {
                    //TODO: may be useless...depend of operator I assume
                    if (isNaN(statusReport.dischargeDate.getTime())) {
                        statusReport.dischargeDate = new Date();
                    }
                    ;
                    yield db.semasim.MessageTowardSip.add(message.toNumber, `${checkMark}${checkMark}`, statusReport.dischargeDate, true, {
                        "target": "SPECIFIC UA REGISTERED TO SIM",
                        "uaSim": message.uaSim
                    });
                    yield db.semasim.MessageTowardSip.add(message.toNumber, `Me:\n${message.text}`, sendDate, true, {
                        "target": "ALL OTHER UA OF USER REGISTERED TO SIM",
                        "uaSim": message.uaSim
                    });
                    yield db.semasim.MessageTowardSip.add(message.toNumber, `${message.uaSim.ua.userEmail}:\n${message.text}`, sendDate, true, {
                        "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                        "uaSim": message.uaSim
                    });
                }
                else {
                    yield db.semasim.MessageTowardSip.add(message.toNumber, crossMark, statusReport.dischargeDate, true, {
                        "target": "SPECIFIC UA REGISTERED TO SIM",
                        "uaSim": message.uaSim
                    });
                }
                notifyNewSipMessagesToSend(dongle.sim.imsi);
            }));
        }
    }));
}
exports.sendMessagesOfDongle = sendMessagesOfDongle;
function notifyNewSipMessagesToSend(imsi) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let contact of sipProxy.getContacts(imsi)) {
            if (!(yield db.semasim.MessageTowardSip.unsentCount(contact.uaSim))) {
                continue;
            }
            if ((yield sipApiBackend.wakeUpContact(contact)) === "REACHABLE") {
                sendMessagesOfContact(contact);
            }
        }
    });
}
exports.notifyNewSipMessagesToSend = notifyNewSipMessagesToSend;
const lockUaEndpoint = new AsyncLock();
/** Contact must be reachable */
function sendMessagesOfContact(contact) {
    lockUaEndpoint.acquire(sipContact_1.Contact.UaSim.id(contact.uaSim), () => __awaiter(this, void 0, void 0, function* () {
        for (let [message, setReceived] of yield db.semasim.MessageTowardSip.getUnsent(contact.uaSim)) {
            try {
                yield sipMessage.sendMessage(contact, message.fromNumber, {}, message.text);
            }
            catch (error) {
                debug("sip Send Message error:", error.message);
                return;
            }
            setReceived();
        }
    }));
}
exports.sendMessagesOfContact = sendMessagesOfContact;
