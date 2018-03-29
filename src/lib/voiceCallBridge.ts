import { SyncEvent } from "ts-events-extended";
import { 
    DongleController as Dc, 
    Ami, 
    agi,
    //types as dcTypes
} from "chan-dongle-extended-client";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as sipProxy from "./sipProxy";
import * as types from "./types";
import * as db from "./db/semasim";
import * as messageDispatcher from "./messagesDispatcher";
//import * as sipLibrary from "../tools/sipLibrary";

import * as _debug from "debug";
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

export const sipCallContext = "from-sip-call";

export function initAgi() {

    let dc = Dc.getInstance();

    dc.ami.startAgi({
        [sipCallContext]: { "_[+0-9].": fromSip },
        [dc.moduleConfiguration.defaults.context]: { "_[+0-9].": fromDongle }
    });

}

async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");

    let dc = Dc.getInstance();
    let ami = dc.ami;

    let imsi = (await channel.relax.getVariable("DONGLEIMSI"))!;

    let dongle = Array.from(dc.usableDongles.values()).find(
        ({ sim }) => sim.imsi === imsi
    );

    if (!dongle){
        return;
    }

    let number = dcMisc.toNationalNumber(channel.request.callerid, imsi);

    let evtReachableContact= new SyncEvent<types.Contact>();

    sipProxy.evtContactRegistration.attach(
        ({ uaSim }) => uaSim.imsi === imsi,
        evtReachableContact,
        contact => evtReachableContact.post(contact)
    );

    for (let contact of sipProxy.getContacts(imsi)) {

        sipProxy.backendSocket.remoteApi
            .wakeUpContact(contact)
            .then(status => {

                if (status === "REACHABLE") {

                    evtReachableContact.post(contact);

                }

            })
            ;

    }

    let ringingChannels = new Map<types.Contact, string>();

    let evtEstablishedOrEnded = new SyncEvent<types.Contact | undefined>();

    evtEstablishedOrEnded.attachOnce(async contact => {

        debug("evtEstablishedOrEnded");

        evtReachableContact.detach();

        sipProxy.evtContactRegistration.detach(evtReachableContact);

        for (let channelName of ringingChannels.values()) {

            ami.postAction("hangup", {
                "channel": channelName,
                "cause": "1"
            }).catch(() => { });

        }

        if (!!contact) {

            let ringingUas = Array.from(ringingChannels.keys())
                .map(contact => contact.uaSim.ua);

                await db.onCallAnswered(
                    number,
                    imsi,
                    contact.uaSim.ua,
                    ringingUas
                );

        } else {

            debug("Dongle channel hanged up but not answered");

            await db.onMissedCall(imsi, number);

        }

        messageDispatcher.notifyNewSipMessagesToSend(imsi);


    });

    let dongleChannelName = channel.request.channel;

    evtReachableContact.attach(contact => {

        debug("Reachable contact!");

        let sipChannelId = Ami.generateUniqueActionId();

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

        ami.evt.attachOnce(
            ({ event, uniqueid }) => (
                event === "Newchannel" &&
                uniqueid === sipChannelId
            ),
            data => {

                let sipChannelName = data.channel;

                debug("New sip channel: ", sipChannelName);

                ringingChannels.set(contact, sipChannelName);

                ami.setVar(
                    "AGC(rx)",
                    gain,
                    sipChannelName
                );

                ami.setVar(
                    `JITTERBUFFER(${jitterBuffer.type})`,
                    jitterBuffer.params,
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

    /** no problem we can emit as long as we attach once */
    evtEstablishedOrEnded.post(undefined);

    debug("Call ended");

}

async function fromSip(channel: agi.AGIChannel): Promise<void> {

    let _ = channel.relax;

    debug("Call originated from sip");

    let contact_uri = await _.getVariable("CHANNEL(pjsip,target_uri)");
    let call_id = (await _.getVariable("CHANNEL(pjsip,call-id)"))!;

    let contact = sipProxy.getContacts()
        .find(({ uri }) => uri === contact_uri)!
        ;

    let dongle = Array.from(Dc.getInstance().usableDongles.values())
        .find(({ sim }) => sim.imsi === contact.uaSim.imsi)
        ;

    if (!dongle) {

        //TODO: Improve
        console.log("DONGLE is not usable");
        return;

    }

    let number = channel.request.extension;

    Dc.getInstance().ami.evt.waitFor(
        e => (
            e["event"] === "RTCPSent" &&
            e["channelstatedesc"] === "Ring" &&
            e["channel"] === channel.request.channel
        ), 30000
    )
        .then(
            () => db.onTargetGsmRinging(contact, number, call_id)
                .then(() => messageDispatcher.sendMessagesOfContact(contact))
        )
        .catch(() => { })
        ;

    await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

    await _.setVariable("AGC(rx)", gain);


    //TODO: there is a delay for call terminated when web client abruptly disconnect.
    await _.exec("Dial", [`Dongle/i:${dongle.imei}/${number}`]);

    //TODO: Increase volume on TX
    debug("call terminated");

}
