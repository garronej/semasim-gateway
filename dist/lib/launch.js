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
process.on("warning", error => {
    console.log("WARNING WARNING WARNING");
    console.log(error.stack);
});
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const db = require("./db");
const sipProxy = require("./sipProxy");
const messagesDispatcher = require("./messagesDispatcher");
const voiceCallBridge = require("./voiceCallBridge");
require("colors");
const _debug = require("debug");
let debug = _debug("_launch");
debug("Starting semasim gateway !");
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Launching!...");
        yield launchDongleController();
        yield db.launch();
        sipProxy.launch();
        voiceCallBridge.initAgi();
        registerListeners();
        init();
        debug("...started");
    });
}
exports.launch = launch;
function launchDongleController() {
    return __awaiter(this, void 0, void 0, function* () {
        let dc = undefined;
        while (!dc) {
            try {
                yield chan_dongle_extended_client_1.DongleController.getInstance().initialization;
                dc = chan_dongle_extended_client_1.DongleController.getInstance();
            }
            catch (_a) {
                debug("dongle-extended not initialized yet, scheduling retry...");
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        dc.evtDisconnect.attachOnce(error => {
            debug(error.message.red);
            throw error;
        });
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (let dongle of dc.usableDongles.values()) {
            messagesDispatcher.sendMessagesOfDongle(dongle);
        }
        let lastMessageReceivedDateBySim = yield db.semasim.lastMessageReceivedDateBySim();
        for (let imsi in lastMessageReceivedDateBySim) {
            //TODO: may throw
            let messages = yield dc.getMessagesOfSim({
                imsi,
                "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
                "flush": true,
            });
            for (let { number, text, date } of messages) {
                yield db.semasim.onDongleMessage(number, text, date, imsi);
            }
        }
    });
}
function registerListeners() {
    let dc = chan_dongle_extended_client_1.DongleController.getInstance();
    sipProxy.backendSocket.evtNewBackendConnection.attach(() => __awaiter(this, void 0, void 0, function* () {
        debug("Connection established with backend");
        for (let dongle of dc.usableDongles.values()) {
            sipProxy.backendSocket.remoteApi.notifySimOnline(dongle);
        }
    }));
    dc.dongles.evtSet.attach(([dongle]) => __awaiter(this, void 0, void 0, function* () {
        if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
            return;
        }
        messagesDispatcher.sendMessagesOfDongle(dongle);
        sipProxy.backendSocket.remoteApi.notifySimOnline(dongle);
    }));
    dc.dongles.evtDelete.attach(([dongle]) => __awaiter(this, void 0, void 0, function* () {
        if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
            return;
        }
        sipProxy.backendSocket.remoteApi.notifySimOffline(dongle.sim.imsi);
    }));
    dc.evtMessage.attach(({ dongle, message }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM DONGLE MESSAGE", { message });
        let wasAdded = yield db.semasim.onDongleMessage(message.number, message.text, message.date, dongle.sim.imsi);
        if (wasAdded) {
            messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);
            dc.getMessagesOfSim({
                "imsi": dongle.sim.imsi,
                "fromDate": message.date,
                "toDate": message.date,
                "flush": true
            });
        }
    }));
    sipProxy.evtContactRegistration.attach((contact) => __awaiter(this, void 0, void 0, function* () {
        debug(`Contact registered`, contact);
        let { isUaCreatedOrUpdated, isFirstUaForSim } = yield db.semasim.addUaSim(contact.uaSim);
        if (isUaCreatedOrUpdated) {
            sipProxy.backendSocket.remoteApi.notifyNewOrUpdatedUa(contact.uaSim.ua);
        }
        if (isFirstUaForSim) {
            debug("First SIM UA");
            let messages = yield dc.getMessagesOfSim({
                "imsi": contact.uaSim.imsi,
                "flush": true
            });
            let tasks = [];
            for (let { number, text, date } of messages) {
                tasks[tasks.length] = db.semasim.onDongleMessage(number, text, date, contact.uaSim.imsi);
            }
            yield Promise.all(tasks);
        }
        messagesDispatcher.sendMessagesOfContact(contact);
    }));
    sipProxy.evtMessage.attach(({ fromContact, toNumber, text, exactSendDate }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM SIP MESSAGE", { toNumber, text });
        let { uaSim } = fromContact;
        yield db.semasim.onSipMessage(toNumber, text, uaSim, exactSendDate);
        let dongle = Array.from(dc.usableDongles.values()).find(({ sim }) => sim.imsi === fromContact.uaSim.imsi);
        if (!dongle) {
            debug("Target dongle not usable".red);
            return;
        }
        messagesDispatcher.sendMessagesOfDongle(dongle);
    }));
}
