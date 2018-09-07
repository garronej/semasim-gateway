import { SyncEvent } from "ts-events-extended";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Ami, agi } from "ts-ami";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as types from "./types";
import * as dbSemasim from "./dbSemasim";
import * as messageDispatcher from "./messagesDispatcher";
import * as sipLibrary from "ts-sip";
import * as logger from "logger";
import * as sipContactsMonitor from "./sipContactsMonitor";
import * as backendRemoteApiCaller from "./toBackend/remoteApiCaller";

const debug = logger.debugFactory();

const gain = `${4000}`;

const jitterBuffer = {
    "type": "adaptive",
    "params": "default"
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
    });

}

async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");

    let imsi = (await channel.relax.getVariable("DONGLEIMSI"))!;

    let dongle = Array.from(dc.usableDongles.values()).find(
        ({ sim }) => sim.imsi === imsi
    );

    if (!dongle) {
        return;
    }

    let number = dcMisc.toNationalNumber(channel.request.callerid, imsi);

    let evtReachableContact = new SyncEvent<types.Contact>();

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

    let ringingChannels = new Map<types.Contact, string>();

    let evtEstablishedOrEnded = new SyncEvent<types.Contact | undefined>();

    evtEstablishedOrEnded.attachOnce(async contact => {

        debug("evtEstablishedOrEnded");

        evtReachableContact.detach();

        sipContactsMonitor.evtContactRegistration.detach(evtReachableContact);

        for (let channelName of ringingChannels.values()) {

            ami.postAction("hangup", {
                "channel": channelName,
                "cause": "1"
            }).catch(() => { });

        }

        if (!!contact) {

            let ringingUas = Array.from(ringingChannels.keys())
                .map(contact => contact.uaSim.ua);

            await dbSemasim.onCallAnswered(
                number,
                imsi,
                contact.uaSim.ua,
                ringingUas
            );

        } else {

            debug("Dongle channel hanged up but not answered");

            await dbSemasim.onMissedCall(imsi, number);

        }

        messageDispatcher.notifyNewSipMessagesToSend(imsi);


    });

    let dongleChannelName = channel.request.channel;

    evtReachableContact.attach(contact => {

        debug("Reachable contact!");

        let sipChannelId = Ami.generateUniqueActionId();

        ami.postAction("Originate", {
            "channel": [
                "PJSIP",
                sipLibrary.parseUri(contact.uri).user!,
                contact.uri
            ].join("/"),
            "application": "Bridge",
            "data": dongleChannelName,
            "callerid": `"" <${number}>`,
            "channelid": sipChannelId
        }).then(() => {

            debug("Answered");

            ringingChannels.delete(contact);

            evtEstablishedOrEnded.post(contact);

        }).catch((error) => ringingChannels.delete(contact));

        ami.evt.attachOnce(
            ({ event, uniqueid }) => (
                event === "Newchannel" &&
                uniqueid === sipChannelId
            ),
            data => {

                let sipChannelName = data.channel;

                debug("New sip channel: ", sipChannelName);

                ringingChannels.set(contact, sipChannelName);

                ami.setVar("AGC(rx)", gain, sipChannelName);

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

    //TODO: there is a delay for call terminated when web client abruptly disconnect.
    await _.exec("Dial", [`Dongle/i:${dongle.imei}/${number}`]);

    //TODO: Increase volume on TX
    debug("call terminated");

}
