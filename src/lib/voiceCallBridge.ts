import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { 
    DongleController as Dc, 
    Ami, 
    agi,
    phoneNumberLibrary as phone
} from "chan-dongle-extended-client";

import { Contact } from "./sipContact";
import * as messageQueue from "./messageQueue";
import * as db from "./db";

import { c } from "./_constants";

import * as sipApiBackend from "./sipApiBackedClientImplementation";

import * as sipProxy from "./sipProxy";

import * as _debug from "debug";
let debug = _debug("_voiceCallBridge");

let dc: Dc;
let ami: Ami;

export function start() {

    dc = Dc.getInstance();
    ami = dc.ami;

    let dongleCallContext = dc.moduleConfiguration.defaults.context;

    let scripts: agi.Scripts = {};

    scripts[c.sipCallContext] = {};
    scripts[c.sipCallContext]["_[+0-9]."] = fromSip;

    scripts[dongleCallContext] = {};
    scripts[dongleCallContext]["_[+0-9]."] = fromDongle;

    dc.ami.startAgi(scripts);

}

async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");

    let imsi = (await channel.relax.getVariable("DONGLEIMSI"))!;

    let dongle = Array.from(dc.activeDongles.values()).find(
        ({ sim })=> sim.imsi === imsi 
    );

    if (!dongle) return;

    let number = phone.toNationalNumber(channel.request.callerid, imsi);

    let evtReachableContact = new SyncEvent<Contact>();

    //TODO: finish

    db.asterisk.evtNewContact.attach(
        ({ uaSim }) => uaSim.imsi === imsi,
        evtReachableContact,
        contact => evtReachableContact.post(contact)
    );

    for( let contact of sipProxy.getContacts(imsi) ){

        sipApiBackend.wakeUpContact(contact).then(
            status=> {

                if( status === "REACHABLE" ){

                    evtReachableContact.post(contact);

                }
                
            }
        );

    }


    let evtEstablishedOrEnded = new VoidSyncEvent();

    let ringingChannels: string[] = [];

    evtEstablishedOrEnded.attachOnce(() => {

        debug("evtEstablishedOrEnded");

        evtReachableContact.detach();

        db.asterisk.evtNewContact.detach(evtReachableContact);

        debug({ ringingChannels });

        for( let ringingChannel of ringingChannels ){

            ami.postAction("hangup", {
                "channel": ringingChannel,
                "cause": "1"
            }).catch(()=>{});

        }

    });

    let dongleChannelName = channel.request.channel;

    evtReachableContact.attach(contact => {

        debug("Reachable contact!");

        let sipChannelId = Ami.generateUniqueActionId();

        let removeFromRinging: () => void;

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

            removeFromRinging()

        });

        ami.evt.attachOnce(
            ({ event, uniqueid }) => (
                event === "Newchannel" &&
                uniqueid === sipChannelId
            ),
            data => {

                let sipChannelName = data.channel;

                debug("New sip channel: ", sipChannelName);

                ringingChannels.push(sipChannelName);

                removeFromRinging = () => ringingChannels.splice(
                    ringingChannels.indexOf(sipChannelName), 1
                );

                ami.setVar("AGC(rx)", c.gain, sipChannelName);
                ami.setVar(
                    `JITTERBUFFER(${c.jitterBuffer.type})`,
                    c.jitterBuffer.params,
                    sipChannelName
                );

            }
        );

    });

    await ami.evt.waitFor(
        ({ event, channel }) => (
            event === "Hangup" &&
            channel === dongleChannelName
        )
    );

    if (!evtEstablishedOrEnded.postCount) {

        debug("Dongle channel hanged up but not answered");

        evtEstablishedOrEnded.post();

        //TODO: Format date for client country
        await db.semasim.MessageTowardSip.add(
            number,
            "Missed call",
            new Date(),
            true,
            {
                "target": "ALL UA REGISTERED TO SIM",
                "imsi": imsi
            }
        );

        messageQueue.notifyNewSipMessagesToSend(imsi);

    }

    debug("Call ended");

}

async function fromSip(channel: agi.AGIChannel) {

    let _ = channel.relax;

    debug("Call originated from sip");

    let imei = channel.request.callerid;

    await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

    await _.setVariable("AGC(rx)", c.gain);

    await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);

    //TODO: Increase volume on TX

    debug("call terminated");

}
