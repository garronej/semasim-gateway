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
const ts_events_extended_1 = require("ts-events-extended");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const dcMisc = require("chan-dongle-extended-client/dist/lib/misc");
const dbAsterisk = require("./dbAsterisk");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const sipProxy = require("./sipProxy");
const db = require("./db");
const messageDispatcher = require("./messagesDispatcher");
const _debug = require("debug");
const debug = _debug("_voiceCallBridge");
const gain = `${4000}`;
const jitterBuffer = {
    //type: "fixed",
    //params: "2500,10000"
    //type: "fixed",
    //params: "default"
    "type": "adaptive",
    "params": "default"
};
exports.sipCallContext = "from-sip-call";
function start() {
    let dc = chan_dongle_extended_client_1.DongleController.getInstance();
    dc.ami.startAgi({
        [exports.sipCallContext]: { "_[+0-9].": fromSip },
        [dc.moduleConfiguration.defaults.context]: { "_[+0-9].": fromDongle }
    });
}
exports.start = start;
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Call originated from dongle");
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        let ami = dc.ami;
        let imsi = (yield channel.relax.getVariable("DONGLEIMSI"));
        let dongle = Array.from(dc.usableDongles.values()).find(({ sim }) => sim.imsi === imsi);
        if (!dongle)
            return;
        let number = dcMisc.toNationalNumber(channel.request.callerid, imsi);
        let evtReachableContact = new ts_events_extended_1.SyncEvent();
        dbAsterisk.evtNewContact.attach(({ uaSim }) => uaSim.imsi === imsi, evtReachableContact, contact => evtReachableContact.post(contact));
        for (let contact of sipProxy.getContacts(imsi)) {
            sipApiBackend
                .wakeUpContact(contact)
                .then(status => (status === "REACHABLE") ? evtReachableContact.post(contact) : null);
        }
        let ringingChannels = new Map();
        let evtEstablishedOrEnded = new ts_events_extended_1.SyncEvent();
        evtEstablishedOrEnded.attachOnce((contact) => __awaiter(this, void 0, void 0, function* () {
            debug("evtEstablishedOrEnded");
            evtReachableContact.detach();
            dbAsterisk.evtNewContact.detach(evtReachableContact);
            for (let channelName of ringingChannels.values()) {
                ami.postAction("hangup", {
                    "channel": channelName,
                    "cause": "1"
                }).catch(() => { });
            }
            if (contact) {
                yield db.onCallAnswered(number, imsi, contact.uaSim.ua, Array.from(ringingChannels.keys()).map(contact => contact.uaSim.ua));
            }
            else {
                debug("Dongle channel hanged up but not answered");
                yield db.onMissedCall(imsi, number);
            }
            messageDispatcher.notifyNewSipMessagesToSend(imsi);
        }));
        let dongleChannelName = channel.request.channel;
        evtReachableContact.attach(contact => {
            debug("Reachable contact!");
            let sipChannelId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
            ami.postAction("Originate", {
                "channel": `PJSIP/${contact.uaSim.imsi}/${contact.uri}`,
                "application": "Bridge",
                "data": dongleChannelName,
                "callerid": `"" <${number}>`,
                "channelid": sipChannelId
            }).then(() => {
                debug("Answered");
                ringingChannels.delete(contact);
                evtEstablishedOrEnded.post(contact);
            }).catch((error) => {
                ringingChannels.delete(contact);
            });
            ami.evt.attachOnce(({ event, uniqueid }) => (event === "Newchannel" &&
                uniqueid === sipChannelId), data => {
                let sipChannelName = data.channel;
                debug("New sip channel: ", sipChannelName);
                ringingChannels.set(contact, sipChannelName);
                ami.setVar("AGC(rx)", gain, sipChannelName);
                ami.setVar(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params, sipChannelName);
            });
        });
        yield ami.evt.waitFor(({ event, channel }) => (event === "Hangup" &&
            channel === dongleChannelName));
        /** no problem we can emit as long as we attach once */
        evtEstablishedOrEnded.post(undefined);
        debug("Call ended");
    });
}
function fromSip(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        let _ = channel.relax;
        debug("Call originated from sip");
        let imei = channel.request.callerid;
        yield _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);
        yield _.setVariable("AGC(rx)", gain);
        yield _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);
        //TODO: Increase volume on TX
        debug("call terminated");
    });
}
