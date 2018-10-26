"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sipLibrary = require("ts-sip");
const ts_events_extended_1 = require("ts-events-extended");
const misc = require("./misc");
const backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
const dbAsterisk = require("./dbAsterisk");
//TODO: create proxy
exports.evtContactRegistration = new ts_events_extended_1.SyncEvent();
function getContacts(imsi) {
    return contacts.get()
        .filter(({ contact }) => !!imsi ? (contact.uaSim.imsi === imsi) : true)
        .map(({ contact }) => contact);
}
exports.getContacts = getContacts;
/** Close all asteriskSocket that has a contact registered to a IMSI */
function discardContactsRegisteredToSim(imsi) {
    for (let { contact, asteriskSocket } of contacts.get()) {
        if (contact.uaSim.imsi === imsi) {
            asteriskSocket.destroy([
                "need password renewal or sim not registered, closing all ast",
                `sockets that have a contact registered to imsi: ${imsi}`
            ].join(" "));
        }
    }
}
exports.discardContactsRegisteredToSim = discardContactsRegisteredToSim;
var contacts;
(function (contacts) {
    const map = new Map();
    contacts.evtExpiredContact = new ts_events_extended_1.SyncEvent();
    function _delete(contact) {
        let entry = map.get(contact);
        if (entry) {
            clearTimeout(entry.timer);
        }
        map.delete(contact);
    }
    contacts._delete = _delete;
    function setOrRefresh(contact, asteriskSocket, timeout) {
        _delete(contact);
        let timer = setTimeout(() => {
            map.delete(contact);
            contacts.evtExpiredContact.post({ contact, asteriskSocket });
        }, timeout);
        timer.unref();
        map.set(contact, { timer, asteriskSocket });
    }
    contacts.setOrRefresh = setOrRefresh;
    function get() {
        let out = [];
        for (let [contact, { asteriskSocket }] of map) {
            out.push({ contact, asteriskSocket });
        }
        return out;
    }
    contacts.get = get;
})(contacts || (contacts = {}));
contacts.evtExpiredContact.attach(({ contact, asteriskSocket }) => {
    asteriskSocket.destroy(`Contact associated to connection expired`);
    backendRemoteApiCaller.forceContactToRegister(contact);
});
function onContactRegistered(contact, expire, asteriskSocket) {
    asteriskSocket.evtClose.attachOnce(() => {
        contacts._delete(contact);
        dbAsterisk.deleteContact(contact);
    });
    contacts.get().find(entry => {
        if (entry.contact !== contact &&
            misc.areSameUaSims(contact.uaSim, entry.contact.uaSim)) {
            entry.asteriskSocket.destroy("Same UA re-registered with an other connection");
            return true;
        }
        return false;
    });
    contacts.setOrRefresh(contact, asteriskSocket, expire * 1000);
    exports.evtContactRegistration.post(contact);
}
/** should be called against every new asterisk socket */
function handleAsteriskSocket(asteriskSocket) {
    let imsi;
    let connectionId;
    asteriskSocket.evtPacketPreWrite.attachOnce(sipLibrary.matchRequest, sipRequest => {
        imsi = misc.readImsi(sipRequest);
        connectionId = misc.cid.read(sipRequest);
    });
    let purgedContactUri;
    asteriskSocket.evtPacketPreWrite.attachOnce((sipPacket) => (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)), sipRequest => {
        let parsedUri = sipLibrary.parseUri(sipLibrary.getContact(sipRequest).uri);
        parsedUri.params = {
            "mk": `${misc.cid.parse(connectionId).timestamp}`.match(/([0-9]{6})$/)[1]
        };
        purgedContactUri = sipLibrary.stringifyUri(parsedUri);
    });
    let contact;
    let expire;
    asteriskSocket.evtPacketPreWrite.attachOnce((sipPacket) => (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER"), sipRequestRegister => {
        const [aorParams, uriParams] = (() => {
            let contactAor = sipLibrary.getContact(sipRequestRegister);
            return [
                contactAor.params,
                sipLibrary.parseUri(contactAor.uri).params
            ];
        })();
        contact = {
            "uri": purgedContactUri,
            connectionId,
            "path": sipLibrary.stringifyPath(sipRequestRegister.headers.path),
            "uaSim": {
                imsi,
                "ua": {
                    "instance": aorParams["+sip.instance"],
                    "userEmail": misc.urlSafeB64.dec((uriParams["enc_email"] ||
                        aorParams["enc_email"])),
                    "platform": (() => {
                        switch (uriParams["pn-type"]) {
                            case "firebase": return "android";
                            case "apple": return "iOS";
                            default: return "web";
                        }
                    })(),
                    "pushToken": uriParams["pn-tok"] || "",
                    "software": sipRequestRegister.headers["user-agent"]
                }
            }
        };
        expire = parseInt(sipRequestRegister.headers["expires"]);
    });
    let evtRegistered = new ts_events_extended_1.VoidSyncEvent();
    asteriskSocket.evtPacketPreWrite.attach((sipPacket) => (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER" &&
        sipPacket.headers["authorization"]), sipRequestRegister => asteriskSocket.evtResponse.attachOnce(sipResponse => sipLibrary.isResponse(sipRequestRegister, sipResponse), ({ status }) => {
        if (status !== 200) {
            return;
        }
        onContactRegistered(contact, expire, asteriskSocket);
        if (!evtRegistered.postCount) {
            evtRegistered.post();
        }
    }));
    asteriskSocket.evtPacketPreWrite.attach((sipPacket) => (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)), sipPacket => sipLibrary.getContact(sipPacket).uri = purgedContactUri);
    return new Promise(resolve => evtRegistered
        .waitFor(6001)
        .then(() => resolve(contact))
        .catch(() => asteriskSocket.destroy("This connection did not register a contact in time")));
}
exports.handleAsteriskSocket = handleAsteriskSocket;
