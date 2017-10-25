import { SyncEvent } from "ts-events-extended";
import { DongleController as Dc } from "chan-dongle-extended-client";

import * as agi from "../tools/agiClient";
import * as phone from "../tools/phoneNumberLibrary";

import { Contact } from "./sipContact";
import * as messageQueue from "./messageQueue";
import * as db from "./db";

import { c } from "./_constants";

import * as sipApiBackend from "./sipApiClientBackend";

import * as _debug from "debug";
let debug = _debug("_voiceCall");

export function start() {

    let dc = Dc.getInstance();

    let dongleCallContext = dc.moduleConfiguration.defaults.context;

    let scripts: agi.Scripts = {};

    scripts[c.sipCallContext] = {};
    scripts[c.sipCallContext]["_[+0-9]."] = fromSip

    scripts[dongleCallContext] = {};
    scripts[dongleCallContext]["_[+0-9]."] = fromDongle

    agi.startServer(scripts, dc.ami);

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

async function fromDongle(channel: agi.AGIChannel) {

    debug("Call originated from dongle");

    let _ = channel.relax;

    let imei = (await _.getVariable("DONGLEIMEI"))!;

    let fromDongle = Dc.getInstance().activeDongles.get(imei);

    if (!fromDongle) return;

    let imsi = fromDongle.sim.imsi;
    let iccid = fromDongle.sim.iccid;

    let number = phone.toNationalNumber(channel.request.callerid, imsi);

    debug(`from number ${number}`);

    let endpoint = { "dongle": { imei }, "sim": { iccid } };

    let prDialString = getDialString(endpoint);

    await _.setVariable("CALLERID(all)", `"" <${number}>`);
    //await _.setVariable("CALLERID(name-charset)", "utf8");
    //await _.setVariable("CALLERID(name)", name || "");

    let failure = await agi.dialAndGetOutboundChannel(
        channel,
        await prDialString,
        async (outboundChannel) => {

            let _ = outboundChannel.relax;

            await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

            await _.setVariable("AGC(rx)", c.gain);

            //TODO: Increase volume on TX

        }
    );

    debug("Call terminated");

    if (failure) {

        //TODO: see if we send missed call if no pick up
        await db.semasim.MessageTowardSip.add(
            number,
            c.strMissedCall,
            new Date(),
            true,
            {
                "is": "ALL UA_ENDPOINT OF ENDPOINT",
                endpoint
            }
        );

        messageQueue.notifyNewSipMessagesToSend(endpoint);

    } 


}

function getDialString(
    endpoint: Contact.UaEndpoint.EndpointRef
) {
    return new Promise<string>(
        async resolve => {

            let reachableContacts: Contact[] = [];

            let evtReachableContact = new SyncEvent<Contact | null >();

            db.asterisk.getEvtNewContact().attach(
                ({ uaEndpoint }) => Contact.UaEndpoint.Endpoint.areSame(uaEndpoint.endpoint, endpoint),
                reachableContacts,
                contact => evtReachableContact.post(contact)
            );

            let resolver = () => {

                db.asterisk.getEvtNewContact().detach(reachableContacts);
                //evtReachableContact.detach();
                clearTimeout(timer);
                clearTimeout(timer2);

                let dialString = (function buildDialString(
                    contacts: Iterable<Contact>
                ): string {

                    let dialStringSplit: string[] = [];

                    for (let contact of contacts){

                        dialStringSplit.push(`PJSIP/${contact.uaEndpoint.endpoint.dongle.imei}/${contact.uri}`);

                    }

                    return dialStringSplit.join("&");

                })(reachableContacts);

                debug("Dial string: ", dialString);

                resolve(dialString);

            };

            let timer = setTimeout(() => {

                if (!reachableContacts.length) return;

                resolver();

            }, 9000);

            let timer2 = setTimeout(resolver, 45000);

            let prContacts = db.asterisk.getContacts(endpoint);

            let contactsCount: number | undefined = undefined;

            evtReachableContact.attach(
                async contact => {

                    if (contact) {
                        reachableContacts.push(contact);
                    }

                    if (contactsCount === undefined) {
                        await prContacts;
                    }

                    if (reachableContacts.length >= contactsCount!) {
                        resolver();
                    }

                }
            );

            let contacts = await prContacts;

            contactsCount = contacts.length;

            for (let contact of contacts) {

                sipApiBackend.wakeUpContact.makeCall(contact).then(
                    status => {

                        if (status === "REACHABLE") {

                            evtReachableContact.post(contact);

                        } else if (status === "UNREACHABLE") {

                            contactsCount!--;

                            evtReachableContact.post(null);

                        }

                    }
                );

            }

        }
    );
}
