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
const dcMisc = require("chan-dongle-extended-client/dist/lib/misc");
//TODO: Create issue on Typescript repository.
dcMisc;
const db = require("./db");
const sipProxy = require("./sipProxy");
const messagesDispatcher = require("./messagesDispatcher");
const voiceCallBridge = require("./voiceCallBridge");
const ts_events_extended_1 = require("ts-events-extended");
const child_process = require("child_process");
const installer_1 = require("../bin/installer");
const path = require("path");
require("colors");
const _debug = require("debug");
let debug = _debug("_launch");
debug("Starting semasim gateway !");
let dc;
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Launching...");
        yield new Promise(resolve => spawn_asterisk(message => {
            debug(`asterisk: ${message}`);
            console.log(JSON.stringify(message));
            if (!!message.match(/Asterisk\ Ready\./)) {
                resolve();
            }
        }).catch((error) => {
            debug(error.message);
            process.exit(-1);
        }));
        ts_ami_1.Ami.getInstance(undefined, installer_1.ast_etc_dir_path);
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
function spawn_asterisk(log) {
    return __awaiter(this, void 0, void 0, function* () {
        const home_path = path.join(installer_1.ast_dir_path, "var", "lib", "asterisk");
        const asterisk_child_process = child_process.spawn(installer_1.ast_path, ["-fvvvv", "-C", installer_1.ast_main_conf_path], {
            "cwd": home_path,
            "env": {
                "HOME": home_path,
                "LD_LIBRARY_PATH": installer_1.ld_library_path_for_asterisk
            }
        });
        asterisk_child_process.stdout.on("data", data => log(data.toString()));
        asterisk_child_process.stderr.on("data", data => log(data.toString().red));
        return new Promise((resolve, reject) => asterisk_child_process.once("close", code => reject(new Error(`Asterisk terminated with code ${code}`))));
    });
}
exports.spawn_asterisk = spawn_asterisk;
function launchDongleController() {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            dc = chan_dongle_extended_client_1.DongleController.getInstance("127.0.0.1", dcMisc.port);
            try {
                yield dc.prInitialization;
            }
            catch (_a) {
                debug("dongle-extended not initialized yet, scheduling retry...");
                continue;
            }
            break;
        }
        dc.evtClose.attachOnce(() => {
            debug("chan-dongle-extended service stopped");
            process.exit(-1);
        });
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
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
    dc.evtMessage.attach(({ dongle, message, submitShouldSave }) => __awaiter(this, void 0, void 0, function* () {
        debug("FROM DONGLE MESSAGE", { message });
        let evtShouldSave = new ts_events_extended_1.SyncEvent();
        submitShouldSave(evtShouldSave.waitFor());
        let wasAdded = yield db.semasim.onDongleMessage(message.number, message.text, message.date, dongle.sim.imsi);
        if (wasAdded) {
            messagesDispatcher.notifyNewSipMessagesToSend(dongle.sim.imsi);
            evtShouldSave.post("DO NOT SAVE MESSAGE");
        }
        else {
            evtShouldSave.post("SAVE MESSAGE");
        }
    }));
    sipProxy.evtContactRegistration.attach((contact) => __awaiter(this, void 0, void 0, function* () {
        debug(`Contact registered`, contact);
        let { isUaCreatedOrUpdated, isFirstUaForSim } = yield db.semasim.addUaSim(contact.uaSim);
        if (isUaCreatedOrUpdated) {
            yield sipProxy.backendSocket.remoteApi.notifyNewOrUpdatedUa(contact.uaSim.ua);
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
