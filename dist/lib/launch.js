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
const ts_ami_1 = require("ts-ami");
const messagesDispatcher = require("./messagesDispatcher");
const voiceCallBridge = require("./voiceCallBridge");
const ts_events_extended_1 = require("ts-events-extended");
const i = require("../bin/installer");
const procAsterisk = require("./procAsterisk");
const procChanDongleExtended = require("./procChanDongleExtended");
const scripting_tools_1 = require("scripting-tools");
const logger = require("logger");
const dbSemasim = require("./dbSemasim");
const dbAsterisk = require("./dbAsterisk");
const backendConnection = require("./toBackend/connection");
const backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
const sipContactsMonitor = require("./sipContactsMonitor");
const sipMessagesMonitor = require("./sipMessagesMonitor");
const phone_number_1 = require("phone-number");
const debug = logger.debugFactory();
function beforeExit() {
    return __awaiter(this, void 0, void 0, function* () {
        const backendSocket = backendConnection.get();
        if (!(backendSocket instanceof Promise)) {
            backendSocket.destroy("Terminating the process");
        }
        yield Promise.all([
            dbAsterisk.beforeExit().catch(() => { }),
            dbSemasim.beforeExit().catch(() => { }),
            //TODO sip proxy before exist.
            scripting_tools_1.safePr(procChanDongleExtended.beforeExit(), 2500)
                .then(() => procAsterisk.beforeExit())
                .catch(() => { })
        ]);
    });
}
exports.beforeExit = beforeExit;
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Starting semasim gateway...");
        yield procAsterisk.spawnAsterisk();
        ts_ami_1.Ami.getInstance(undefined, i.ast_etc_dir_path)
            .evtTcpConnectionClosed.attachOnce(() => Promise.reject(new Error("Asterisk TCP connection closed")));
        yield procChanDongleExtended.spawnChanDongleExtended();
        //TODO: rename init ? 
        yield dbAsterisk.launch();
        yield dbSemasim.launch();
        yield sipMessagesMonitor.init();
        backendConnection.connect();
        voiceCallBridge.initAgi();
        registerListeners();
        init();
        debug("...started");
    });
}
exports.launch = launch;
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const dc = chan_dongle_extended_client_1.DongleController.getInstance();
        for (const dongle of dc.usableDongles.values()) {
            messagesDispatcher.sendMessagesOfDongle(dongle);
        }
        const lastMessageReceivedDateBySim = yield dbSemasim.lastMessageReceivedDateBySim();
        for (const imsi in lastMessageReceivedDateBySim) {
            //NOTE: should not throw but if it does it is the expected behavior.
            const messages = yield dc.getMessages({
                imsi,
                "fromDate": new Date(lastMessageReceivedDateBySim[imsi].getTime() + 1),
                "flush": true
            });
            for (const { number, text, date } of messages) {
                yield dbSemasim.onDongleMessage(number, text, date, imsi);
            }
        }
    });
}
function registerListeners() {
    const dc = chan_dongle_extended_client_1.DongleController.getInstance();
    backendConnection.evtConnect.attach(() => {
        debug("Connection established with backend");
        for (const dongle of dc.dongles.values()) {
            if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
                backendRemoteApiCaller.notifyLockedDongle(dongle);
            }
            else {
                backendRemoteApiCaller.notifySimOnline(dongle);
            }
        }
    });
    dc.dongles.evtSet.attach(([dongle]) => {
        if (chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle)) {
            backendRemoteApiCaller.notifyLockedDongle(dongle);
        }
        else {
            messagesDispatcher.sendMessagesOfDongle(dongle);
            backendRemoteApiCaller.notifySimOnline(dongle);
        }
    });
    dc.dongles.evtDelete.attach(([dongle]) => backendRemoteApiCaller.notifyDongleOffline(dongle));
    dc.evtMessage.attach(({ dongle, message, submitShouldSave }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM DONGLE MESSAGE", { message });
        let evtShouldSave = new ts_events_extended_1.SyncEvent();
        submitShouldSave(evtShouldSave.waitFor());
        const wasAdded = yield dbSemasim.onDongleMessage(phone_number_1.phoneNumber.build(message.number, !!dongle.sim.country ? dongle.sim.country.iso : undefined), message.text, message.date, dongle.sim.imsi);
        if (wasAdded) {
            messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);
            evtShouldSave.post("DO NOT SAVE MESSAGE");
        }
        else {
            evtShouldSave.post("SAVE MESSAGE");
        }
    }));
    sipContactsMonitor.evtContactRegistration.attach((contact) => __awaiter(this, void 0, void 0, function* () {
        debug(`Contact registered`, contact);
        let { isUaCreatedOrUpdated, isFirstUaForSim } = yield dbSemasim.addUaSim(contact.uaSim);
        if (isUaCreatedOrUpdated) {
            yield backendRemoteApiCaller.notifyNewOrUpdatedUa(contact.uaSim.ua);
        }
        if (isFirstUaForSim) {
            debug("First SIM UA");
            const messages = yield dc.getMessages({
                "imsi": contact.uaSim.imsi,
                "flush": true
            });
            const tasks = [];
            for (const { number, text, date } of messages) {
                tasks[tasks.length] = dbSemasim.onDongleMessage(number, text, date, contact.uaSim.imsi);
            }
            yield Promise.all(tasks);
        }
        messagesDispatcher.sendMessagesOfContact(contact);
    }));
    sipMessagesMonitor.evtMessage.attach(({ fromContact, toNumber, text, exactSendDate }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM SIP MESSAGE", { toNumber, text });
        const { uaSim } = fromContact;
        yield dbSemasim.onSipMessage(toNumber, text, uaSim, exactSendDate);
        const dongle = Array.from(dc.usableDongles.values()).find(({ sim }) => sim.imsi === uaSim.imsi);
        if (!dongle) {
            debug("Target dongle not usable".red);
            return;
        }
        messagesDispatcher.sendMessagesOfDongle(dongle);
    }));
}
