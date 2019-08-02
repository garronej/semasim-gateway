import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Ami, agi } from "ts-ami";
//import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import { phoneNumber } from "phone-number";
import * as types from "./types";
import * as dbSemasim from "./dbSemasim";
import * as messageDispatcher from "./messagesDispatcher";
import * as sip from "ts-sip";
import * as logger from "logger";
import * as sipContactsMonitor from "./sipContactsMonitor";
import * as backendRemoteApiCaller from "./toBackend/remoteApiCaller";

const debug = logger.debugFactory();

const gain = "4000";

const volume= "11";

/*
//Work always but introduce delay
const jitterBuffer = {
    "type": "fixed",
    "params": "default"
};
*/

/*
//Ultra long delay, to test
const jitterBuffer = {
    "type": "fixed",
    "params": "2500,10000"
};
*/

/*
//Loss at the beginning of the call from linphone to ast
const jitterBuffer = {
    "type": "adaptive",
    "params": "default"
};
*/

//Work just fine
const jitterBuffer = {
    "type": "adaptive",
    "params": "2000,1600,120"
};

export const sipCallContext = "from-sip-call";

let dc!: Dc;
let ami!: Ami;

export function initAgi() {

    ami = Ami.getInstance();
    dc = Dc.getInstance();

    const dongleCallContext = dc.staticModuleConfiguration.defaults["context"];

    ami.startAgi({
        [sipCallContext]: { "_[+0-9].": fromSip },
        [dongleCallContext]: { "_[+0-9].": fromDongle }
    }, undefined, (severity, message, error)=> {

        if( severity === "WARNING" ){

            debug(message, error);

        }else{

            debug(severity, message);

            throw error;

        }
        

    });

}

async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");

    const imsi = (await channel.relax.getVariable("DONGLEIMSI"))!;

    const dongle = Array.from(dc.usableDongles.values()).find(
        ({ sim }) => sim.imsi === imsi
    );

    if (!dongle) {
        return;
    }

    const number = phoneNumber.build(
        channel.request.callerid, 
        !!dongle.sim.country?dongle.sim.country.iso:undefined
    );

    const evtReachableContact = new SyncEvent<types.Contact>();

    sipContactsMonitor.evtContactRegistration.attach(
        ({ uaSim }) => uaSim.imsi === imsi,
        evtReachableContact,
        contact => evtReachableContact.post(contact)
    );

    for (let contact of sipContactsMonitor.getContacts(imsi)) {

        backendRemoteApiCaller
            .wakeUpContact(contact)
            .then(status => {

                if (status === "REACHABLE") {

                    evtReachableContact.post(contact);

                }

            })
            ;

    }

    const channels = new Map<types.Contact, { 
        channelName: string; 
        state: "RINGING" | "REJECTED" | "ANSWERED" 
    }>();

    const evtAnsweredOrEnded = new VoidSyncEvent();

    evtAnsweredOrEnded.attachOnce(async () => {

        debug("evtEstablishedOrEnded");

        evtReachableContact.detach();

        sipContactsMonitor.evtContactRegistration.detach(evtReachableContact);

        Array.from(channels.values())
            .filter(({ state }) => state === "RINGING")
            .forEach(({ channelName }) => ami.postAction("hangup", {
                "channel": channelName,
                "cause": "1"
            }).catch(() => { }))
            ;

        const [answeredByContact] = Array.from(channels)
            .filter(([_, { state }]) => state === "ANSWERED")
            .map(([contact]) => contact)
            ;

        if (!!answeredByContact) {

            await dbSemasim.onCallAnswered(
                number,
                imsi,
                answeredByContact.uaSim.ua,
                Array.from(channels.keys())
                    .filter(_contact => _contact !== answeredByContact)
                    .map(contact => contact.uaSim.ua)

            );

        } else {

            debug("Dongle channel hanged up but not answered");

            await dbSemasim.onMissedCall(imsi, number);

        }

        messageDispatcher.notifyNewSipMessagesToSend(imsi);


    });

    const dongleChannelName = channel.request.channel;

    evtReachableContact.attach(contact => {

        debug("Reachable contact!");

        let sipChannelId = Ami.generateUniqueActionId();

        ami.postAction("Originate", {
            "channel": [
                "PJSIP",
                sip.parseUri(contact.uri).user!,
                contact.uri
            ].join("/"),
            "application": "Bridge",
            "data": dongleChannelName,
            "callerid": `"" <${number}>`,
            "channelid": sipChannelId
        }).then(() => {

            debug("Answered");

            channels.get(contact)!.state = "ANSWERED";

            evtAnsweredOrEnded.post();

        }).catch(() => {

            channels.get(contact)!.state = "REJECTED";

        });

        ami.evt.attachOnce(
            ({ event, uniqueid }) => (
                event === "Newchannel" &&
                uniqueid === sipChannelId
            ),
            data => {

                const channelName = data.channel;

                debug("New sip channel: ", channelName);

                channels.set(contact, { channelName, "state": "RINGING" });

                ami.setVar("AGC(rx)", gain, channelName);

                ami.setVar(
                    `JITTERBUFFER(${jitterBuffer.type})`,
                    jitterBuffer.params,
                    channelName
                );

                //To automatically increase the volume toward the softphone.
                ami.setVar("VOLUME(TX)", volume, channelName);

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
    evtAnsweredOrEnded.post();

    debug("Call ended");

}

async function fromSip(channel: agi.AGIChannel): Promise<void> {

    const _ = channel.relax;

    debug("Call originated from sip");

    const contact_uri = await _.getVariable("CHANNEL(pjsip,target_uri)");

    const call_id = (await _.getVariable("CHANNEL(pjsip,call-id)"))!;

    const contact = sipContactsMonitor.getContacts()
        .find(({ uri }) => uri === contact_uri)!
        ;

    const dongle = Array.from(Dc.getInstance().usableDongles.values())
        .find(({ sim }) => sim.imsi === contact.uaSim.imsi)
        ;

    if (!dongle) {

        //TODO: Improve
        debug("DONGLE is not usable");
        return;

    }

    const number = channel.request.extension;

    ami.evt.waitFor(
        e => (
            e["event"] === "RTCPSent" &&
            e["channelstatedesc"] === "Ring" &&
            e["channel"] === channel.request.channel
        ), 30000
    )
        .then(
            () => dbSemasim.onTargetGsmRinging(contact, number, call_id)
                .then(() => messageDispatcher.sendMessagesOfContact(contact))
        )
        .catch(() => { })
        ;

    await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

    await _.setVariable("AGC(rx)", gain);

    //To automatically increase the volume toward the softphone.
    await _.setVariable("VOLUME(TX)",volume);

    //TODO: Dial with guessed from ( and only dial, even if not very important)
    //TODO: there is a delay for call terminated when web client abruptly disconnect.
    await _.exec("Dial", [`Dongle/i:${dongle.imei}/${number}`]);

    //TODO: Increase volume on TX
    debug("call terminated");

}
