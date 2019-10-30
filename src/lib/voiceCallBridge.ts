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
import * as toBackendRemoteApiCaller from "./toBackend/remoteApiCaller";
import { generateUaId } from "./misc/misc";
import { 
    getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered 
} from "./misc/getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered";


const debug = logger.debugFactory();

const gain = "3000";

//const volume= "11";

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
/*
const jitterBuffer = {
    "type": "adaptive",
    "params": "2000,1600,120"
};
*/

const jitterBuffer = {
    "type": "adaptive",
    "params": "200,1600,10"
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

class OngoingCall {

    public static readonly set= new Set<OngoingCall>();

    private static readonly terminatedCalls= new WeakSet<OngoingCall>();

    public static addCall(ongoingCall: OngoingCall): OngoingCall{

        this.set.add(ongoingCall);
        
        //NOTE: We wait for a user to join the call before notifying.
        return ongoingCall;

    }

    public static deleteCall(ongoingCall: OngoingCall){

        this.terminatedCalls.add(ongoingCall);

        this.set.delete(ongoingCall);

        this.notifyCall(ongoingCall, true);

    }


    public static addUaToCall(ongoingCall: OngoingCall, ua: types.Ua){
        ongoingCall.uasInCall.set(generateUaId(ua), ua);

        //NOTE: We prevent notifying a call that have been terminated already.
        //Maybe never happen but we add this check for safety.
        if( this.terminatedCalls.has(ongoingCall) ){
            return;
        }


        this.notifyCall(ongoingCall, false);
    }


    public static removeUaFromCall(ongoingCall: OngoingCall, ua: types.Ua){

        ongoingCall.uasInCall.delete(generateUaId(ua));

        //NOTE: If the call is terminated we do not notify.
        if( this.terminatedCalls.has(ongoingCall) ){
            return;
        }

        this.notifyCall(ongoingCall, false);

    }


    private static notifyCall(ongoingCall: OngoingCall, isTerminated: boolean){

        toBackendRemoteApiCaller.notifyOngoingCall({
            "ongoingCallId": ongoingCall.id,
            "from": ongoingCall.from,
            "imsi": ongoingCall.imsi,
            "number": ongoingCall.number,
            "uasInCall": Array.from(ongoingCall.uasInCall.values())
                .map(({ instance, userEmail }) => ({ instance, userEmail })),
            isTerminated
        });

    }

    
    private readonly id: string;
        
    public resolvePrBridgeCall!: ()=> void;
        
    public readonly prBridgeCall: Promise<void>;

    private readonly uasInCall = new Map<string, types.Ua>();


    public constructor(
        private readonly from: "DONGLE" | "SIP",
        public readonly imsi: string,
        public readonly number: string,
        public readonly dongleChannelName: string
    ){

        this.id = [ imsi, number, Date.now() ].join("-");

        this.prBridgeCall = new Promise<void>(
            resolve => this.resolvePrBridgeCall= resolve
        );

    }

    public getNumberOfUasInTheCall(){
        return this.uasInCall.size;
    }

    public isUserAlreadyInTheCall(userEmail: string): boolean {

        return !!Array.from(this.uasInCall.values())
            .find(ua => ua.userEmail === userEmail);

    }


}




async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");


    /*
    console.log("================> dingo!");

    let _= channel.relax;

    await _.answer();

    console.log("waiting two second");
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    console.log("=========================================>stream!");
    await _.streamFile("demo-congrats");


    console.log("Hangup!!!!!!!!!!!!!!!!!!!");
    await _.hangup();


    if( 1 === 1 ){
        return;
    }
    */

    const imsi = (await channel.relax.getVariable("DONGLEIMSI"))!;

    const dongle = Array.from(dc.usableDongles.values()).find(
        ({ sim }) => sim.imsi === imsi
    );

    if (!dongle) {
        return;
    }

    const number = phoneNumber.build(
        channel.request.callerid,
        !!dongle.sim.country ? dongle.sim.country.iso : undefined
    );

    const evtReachableContact = new SyncEvent<types.Contact>();

    /*
    NOTE: evtContactRegistration is also posted when a contact refresh
    it's registration. 
    It is possible that a contact "REACHABLE" ( that responded to the notify )
    then send a register to refresh it's registration. We don't want the same
    contact to be posted two times by evtReachableContact so with the next
    block we extract contacts that have already been posted.
    */
    {
        const postedContacts= new WeakSet<types.Contact>();

        evtReachableContact.attach(contact=> postedContacts.add(contact));

        evtReachableContact.attachExtract(
            contact => postedContacts.has(contact),
            contact => debug("==========> prevent re posting contact that have already be posted", contact)
        );

    }


    sipContactsMonitor.evtContactRegistration.attach(
        ({ uaSim }) => uaSim.imsi === imsi,
        evtReachableContact,
        contact => evtReachableContact.post(contact)
    );

    getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered({
        imsi,
        "reachableSipContactCallbackFn": contact=> evtReachableContact.post(contact)
    });

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

    const ongoingCall = new OngoingCall(
        "DONGLE", imsi, number, dongleChannelName
    );

    OngoingCall.addCall(ongoingCall);



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

            const { ua } = contact.uaSim;

            OngoingCall.addUaToCall(ongoingCall, ua);

            ami.evt.attachOnce(
                ({ event, uniqueid }) => (
                    event === "Hangup" &&
                    uniqueid === sipChannelId
                ),
                () => OngoingCall.removeUaFromCall(ongoingCall, ua)
            );

            evtAnsweredOrEnded.post();

        }).catch(() =>
            channels.get(contact)!.state = "REJECTED"
        );

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
                //ami.setVar("VOLUME(TX)", volume, channelName);
                ami.setVar("AGC(tx)", "32768", channelName);

            }
        );

    });


    ami.evt.attachOnce(
        e => (
            e.event === "BridgeEnter" &&
            e["channel"] === dongleChannelName
        ),
        channel,
        () => ongoingCall.resolvePrBridgeCall()
    );

    await ami.evt.waitFor(
        ({ event, channel }) => (
            event === "Hangup" &&
            channel === dongleChannelName
        )
    );

    ami.evt.detach(channel);

    OngoingCall.deleteCall(ongoingCall);

    /** no problem we can emit as long as we attach once */
    evtAnsweredOrEnded.post();

    debug("Call ended");

}

async function fromSip(channel: agi.AGIChannel): Promise<void> {

    const _ = channel.relax;

    const setGainControlAndJitterBuffer = async () => {

        await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

        await _.setVariable("AGC(rx)", gain);

        //To automatically increase the volume toward the softphone.
        //await _.setVariable("VOLUME(TX)",volume);
        await _.setVariable("AGC(tx)", "32768");

    };

    debug("Call originated from sip");

    const contact = await (async () => {

        const contact_uri = await _.getVariable("CHANNEL(pjsip,target_uri)");

        return sipContactsMonitor.getContacts()
            .find(({ uri }) => uri === contact_uri)!
            ;

    })();

    const call_id = (await _.getVariable("CHANNEL(pjsip,call-id)"))!;

    const number = channel.request.extension;

    const dongle = Array.from(Dc.getInstance().usableDongles.values())
        .find(({ sim }) => sim.imsi === contact.uaSim.imsi)
        ;

    if (!dongle) {

        //TODO: Improve
        debug("DONGLE is not usable");
        return;

    }



    let ongoingCall = Array.from(OngoingCall.set)
        .find(({ imsi }) => imsi === contact.uaSim.imsi)
        ;

    debug({ ongoingCall });

    if (ongoingCall !== undefined) {


        if (ongoingCall.number !== number) {

            debug(`Dongle already in a call with an other number (${ongoingCall.number})`);

            await _.hangup();

            return;

        }

        if (ongoingCall.getNumberOfUasInTheCall() === 0) {

            debug("The user phone is about to ring");

            await _.hangup();

            return;

        }

        if (ongoingCall.isUserAlreadyInTheCall(contact.uaSim.ua.userEmail)) {

            debug("User is already calling with an other device!");

            await _.hangup();

            return;
        }

        OngoingCall.addUaToCall(ongoingCall, contact.uaSim.ua);


        await setGainControlAndJitterBuffer();

        await ongoingCall.prBridgeCall;

        await _.exec("BridgeAdd", [ongoingCall.dongleChannelName]);

        OngoingCall.removeUaFromCall(ongoingCall, contact.uaSim.ua);

        return;

    }

    ami.evt.attachOnce(
        ({ event, linkedid }) => (
            event === "Newchannel" &&
            linkedid === channel.request.uniqueid
        ),
        channel,
        ({ channel: dongleChannelName }) => {

            const ongoingCall = new OngoingCall("SIP", contact.uaSim.imsi, number, dongleChannelName);

            ami.evt.attachOnce(
                e => (
                    e.event === "BridgeEnter" &&
                    e["channel"] === channel.request.channel
                ),
                channel,
                () => ongoingCall.resolvePrBridgeCall()
            );

            ami.evt.attachOnce(
                e => (
                    e.event === "Hangup" &&
                    e["channel"] === channel.request.channel
                ),
                () => OngoingCall.removeUaFromCall(ongoingCall, contact.uaSim.ua)
            );

            OngoingCall.addCall(ongoingCall);

            OngoingCall.addUaToCall(ongoingCall, contact.uaSim.ua);

            ami.evt.attachOnce(
                e => (
                    e.event === "Hangup" &&
                    e["channel"] === dongleChannelName
                ),
                () => OngoingCall.deleteCall(ongoingCall)
            );
        }
    );

    {

        const callPlacedAtDateTime = Date.now();
        let callRingingAfterMs: number | undefined = undefined;
        let callAnsweredAfterMs: number | undefined = undefined;

        const sendCallLogNotification = () => dbSemasim.onCallFromSipTerminated(
            number,
            contact.uaSim.imsi,
            callPlacedAtDateTime,
            callRingingAfterMs,
            callAnsweredAfterMs,
            Date.now() - callPlacedAtDateTime,
            contact.uaSim.ua
        ).then(() => messageDispatcher.notifyNewSipMessagesToSend(contact.uaSim.imsi));

        ami.evt.attachOnce(
            e => (
                e["event"] === "RTCPSent" &&
                e["channelstatedesc"] === "Ring" &&
                e["channel"] === channel.request.channel
            ),
            channel,
            () => {

                callRingingAfterMs = Date.now() - callPlacedAtDateTime;

                dbSemasim.onTargetGsmRinging(contact, number, call_id)
                    .then(() => messageDispatcher.sendMessagesOfContact(contact));

            }
        );

        ami.evt.attachOnce(
            e => (
                e["event"] === "BridgeEnter" &&
                e["channel"] !== channel.request.channel &&
                e["linkedid"] === channel.request.uniqueid
            ),
            channel,
            ({ channel: dongleChannelName }) => {

                if (callRingingAfterMs === undefined) {

                    callRingingAfterMs = Date.now();
                }

                callAnsweredAfterMs = Date.now() - callPlacedAtDateTime;

                ami.evt.attachOnce(
                    e => (
                        e["event"] === "Hangup" &&
                        e["channel"] === dongleChannelName
                    ),
                    () => sendCallLogNotification()
                );

            }
        );

        ami.evt.attachOnce(
            e => (
                e["channel"] === channel.request.channel &&
                e["event"] === "Hangup"

            ),
            () => {

                if (callAnsweredAfterMs !== undefined) {
                    return;
                }

                sendCallLogNotification();
            }
        );

    }

    ami.evt.attachOnce(
        e => (
            e["channel"] === channel.request.channel &&
            e["event"] === "Hangup"

        ),
        () => ami.evt.detach(channel)
    );

    await setGainControlAndJitterBuffer();

    //TODO: Dial with guessed from ( and only dial, even if not very important)
    //TODO: there is a delay for call terminated when web client abruptly disconnect.
    await _.exec("Dial", [`Dongle/i:${dongle.imei}/${number}`]);

    //TODO: Increase volume on TX
    debug("call terminated");

}


