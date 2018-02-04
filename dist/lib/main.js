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
require("rejection-tracker").main(__dirname, "..", "..");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const db = require("./db");
const sipProxy = require("./sipProxy");
const sipMessage = require("./sipMessage");
const messageQueue = require("./messageQueue");
const voiceCallBridge = require("./voiceCallBridge");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const sipApiServer = require("./sipApiGatewayServerImplementation");
const _debug = require("debug");
let debug = _debug("_main");
debug("Starting semasim gateway !");
(function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield chan_dongle_extended_client_1.DongleController.getInstance().initialization;
        }
        catch (_a) {
            debug("dongle-extended not initialized yet, scheduling retry...");
            yield new Promise(resolve => setTimeout(resolve, 5000));
            launch();
            return;
        }
        chan_dongle_extended_client_1.DongleController.getInstance().evtDisconnect.attachOnce(error => {
            debug(error.message.red);
            process.exit(-1);
        });
        debug("Launching...");
        registerListeners();
        yield db.asterisk.startListeningPsContacts();
        yield sipMessage.startHandling();
        voiceCallBridge.start();
        sipProxy.start();
        processGsmMessageIoOccurredWhileOffline();
        debug("...started");
    });
})();
function processGsmMessageIoOccurredWhileOffline() {
    return __awaiter(this, void 0, void 0, function* () {
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (let dongle of dc.activeDongles.values()) {
            messageQueue.sendMessagesOfDongle(dongle);
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
                yield db.semasim.MessageTowardSip.add(number, text, date, false, {
                    "target": "ALL UA REGISTERED TO SIM",
                    "imsi": imsi
                });
            }
        }
    });
}
function registerListeners() {
    let dc = chan_dongle_extended_client_1.DongleController.getInstance();
    sipProxy.evtNewBackendSocketConnect.attach((backendSocket) => __awaiter(this, void 0, void 0, function* () {
        debug("Connection established with backend");
        sipApiServer.startListening(backendSocket);
        sipApiBackend.init(backendSocket);
        for (let dongle of dc.activeDongles.values()) {
            sipApiBackend.notifySimOnline(dongle);
        }
    }));
    dc.dongles.evtSet.attach(([dongle]) => __awaiter(this, void 0, void 0, function* () {
        if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle))
            return;
        messageQueue.sendMessagesOfDongle(dongle);
        sipApiBackend.notifySimOnline(dongle);
    }));
    dc.dongles.evtDelete.attach(([dongle]) => __awaiter(this, void 0, void 0, function* () {
        if (!chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle))
            return;
        sipApiBackend.notifySimOffline(dongle.sim.imsi);
    }));
    dc.evtMessage.attach(({ dongle, message }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM DONGLE MESSAGE", { message });
        let isHandled = yield db.semasim.MessageTowardSip.add(message.number, message.text, message.date, false, {
            "target": "ALL UA REGISTERED TO SIM",
            "imsi": dongle.sim.imsi
        });
        if (isHandled) {
            dc.getMessagesOfSim({
                "imsi": dongle.sim.imsi,
                "fromDate": message.date,
                "toDate": message.date,
                "flush": true
            });
        }
        messageQueue.notifyNewSipMessagesToSend(dongle.sim.imsi);
    }));
    db.asterisk.evtNewContact.attach((contact) => __awaiter(this, void 0, void 0, function* () {
        debug(`Contact registered`);
        console.log(contact);
        let { isUaCreatedOrUpdated, isFirstUaForSim } = yield db.semasim.addUaSim(contact.uaSim);
        if (isUaCreatedOrUpdated) {
            sipApiBackend.notifyNewOrUpdatedUa(contact.uaSim.ua);
        }
        if (isFirstUaForSim) {
            debug("First SIM UA");
            let messages = yield dc.getMessagesOfSim({
                "imsi": contact.uaSim.imsi,
                "flush": true
            });
            for (let { number, text, date } of messages) {
                db.semasim.MessageTowardSip.add(number, text, date, false, {
                    "target": "ALL UA REGISTERED TO SIM",
                    "imsi": contact.uaSim.imsi
                });
            }
        }
        messageQueue.sendMessagesOfContact(contact);
    }));
    sipMessage.evtMessage.attach(({ fromContact, toNumber, text }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM SIP MESSAGE", { toNumber, text });
        let { uaSim } = fromContact;
        yield db.semasim.MessageTowardGsm.add(toNumber, text, uaSim);
        let dongle = Array.from(dc.activeDongles.values()).find(({ sim }) => sim.imsi === fromContact.uaSim.imsi);
        if (!dongle)
            return;
        messageQueue.sendMessagesOfDongle(dongle);
    }));
}
