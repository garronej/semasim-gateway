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
const messageQueue = require("./messageQueue");
const db = require("./db");
const _constants_1 = require("./_constants");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const sipProxy = require("./sipProxy");
const _debug = require("debug");
let debug = _debug("_voiceCallBridge");
let dc;
let ami;
function start() {
    dc = chan_dongle_extended_client_1.DongleController.getInstance();
    ami = dc.ami;
    let dongleCallContext = dc.moduleConfiguration.defaults.context;
    let scripts = {};
    scripts[_constants_1.c.sipCallContext] = {};
    scripts[_constants_1.c.sipCallContext]["_[+0-9]."] = fromSip;
    scripts[dongleCallContext] = {};
    scripts[dongleCallContext]["_[+0-9]."] = fromDongle;
    dc.ami.startAgi(scripts);
}
exports.start = start;
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        debug("Call originated from dongle");
        let imsi = (yield channel.relax.getVariable("DONGLEIMSI"));
        let dongle = Array.from(dc.activeDongles.values()).find(({ sim }) => sim.imsi === imsi);
        if (!dongle)
            return;
        let number = chan_dongle_extended_client_1.utils.toNationalNumber(channel.request.callerid, imsi);
        let evtReachableContact = new ts_events_extended_1.SyncEvent();
        //TODO: finish
        db.asterisk.evtNewContact.attach(({ uaSim }) => uaSim.imsi === imsi, evtReachableContact, contact => evtReachableContact.post(contact));
        for (let contact of sipProxy.getContacts(imsi)) {
            sipApiBackend.wakeUpContact(contact).then(status => {
                if (status === "REACHABLE") {
                    evtReachableContact.post(contact);
                }
            });
        }
        let evtEstablishedOrEnded = new ts_events_extended_1.VoidSyncEvent();
        let ringingChannels = [];
        evtEstablishedOrEnded.attachOnce(() => {
            debug("evtEstablishedOrEnded");
            evtReachableContact.detach();
            db.asterisk.evtNewContact.detach(evtReachableContact);
            debug({ ringingChannels });
            for (let ringingChannel of ringingChannels) {
                ami.postAction("hangup", {
                    "channel": ringingChannel,
                    "cause": "1"
                }).catch(() => { });
            }
        });
        let dongleChannelName = channel.request.channel;
        evtReachableContact.attach(contact => {
            debug("Reachable contact!");
            let sipChannelId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
            let removeFromRinging;
            ami.postAction("Originate", {
                "channel": `PJSIP/${contact.uaSim.imsi}/${contact.uri}`,
                "application": "Bridge",
                "data": dongleChannelName,
                "callerid": `"" <${number}>`,
                "channelid": sipChannelId
            }).then(() => {
                debug("Answered");
                removeFromRinging();
                evtEstablishedOrEnded.post();
            }).catch((error) => {
                removeFromRinging();
            });
            ami.evt.attachOnce(({ event, uniqueid }) => (event === "Newchannel" &&
                uniqueid === sipChannelId), data => {
                let sipChannelName = data.channel;
                debug("New sip channel: ", sipChannelName);
                ringingChannels.push(sipChannelName);
                removeFromRinging = () => ringingChannels.splice(ringingChannels.indexOf(sipChannelName), 1);
                ami.setVar("AGC(rx)", _constants_1.c.gain, sipChannelName);
                ami.setVar(`JITTERBUFFER(${_constants_1.c.jitterBuffer.type})`, _constants_1.c.jitterBuffer.params, sipChannelName);
            });
        });
        yield ami.evt.waitFor(({ event, channel }) => (event === "Hangup" &&
            channel === dongleChannelName));
        if (!evtEstablishedOrEnded.postCount) {
            debug("Dongle channel hanged up but not answered");
            evtEstablishedOrEnded.post();
            //TODO: Format date for client country
            yield db.semasim.MessageTowardSip.add(number, "Missed call", new Date(), true, {
                "target": "ALL UA REGISTERED TO SIM",
                "imsi": imsi
            });
            messageQueue.notifyNewSipMessagesToSend(imsi);
        }
        debug("Call ended");
    });
}
function fromSip(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        let _ = channel.relax;
        debug("Call originated from sip");
        let imei = channel.request.callerid;
        yield _.setVariable(`JITTERBUFFER(${_constants_1.c.jitterBuffer.type})`, _constants_1.c.jitterBuffer.params);
        yield _.setVariable("AGC(rx)", _constants_1.c.gain);
        yield _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);
        //TODO: Increase volume on TX
        debug("call terminated");
    });
}
