"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbAsterisk = require("../../db/asterisk");
const types = require("../../types");
const backendSocket = require("./../backendSocket");
const ts_events_extended_1 = require("ts-events-extended");
const store = require("./store");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/asteriskSockets/contactsRegistrationMonitor");
exports.evtContactRegistration = new ts_events_extended_1.SyncEvent();
function onNewAsteriskSocket(asteriskSocket, { connectionId, imsi }) {
    asteriskSocket.misc["__prContact__"] = new Promise(resolve => dbAsterisk.evtNewContact.waitFor(contact => (contact.connectionId === connectionId &&
        contact.uaSim.imsi === imsi), 6001).then(contact => {
        const boundTo = [];
        asteriskSocket.evtClose.attachOnce(() => {
            dbAsterisk.evtExpiredContact.detach(boundTo);
            dbAsterisk.deleteContact(contact);
        });
        dbAsterisk.evtExpiredContact.attachOnce(expiredContact => expiredContact.id === contact.id, boundTo, () => {
            debug("expired contact");
            asteriskSocket.destroy();
            backendSocket.remoteApi.forceContactToRegister(contact);
        });
        for (let [socket_i, contact_i] of getContactMap()) {
            if (contact_i && types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {
                debug("ua re-register with an other connection");
                socket_i.destroy();
                break;
            }
        }
        asteriskSocket.misc["__contact__"] = contact;
        exports.evtContactRegistration.post(contact);
        resolve(contact);
    }).catch(() => asteriskSocket.destroy()));
}
exports.onNewAsteriskSocket = onNewAsteriskSocket;
function getSocketContact(socket) {
    return socket.misc["__contact__"] || socket.misc["__prContact__"];
}
exports.getSocketContact = getSocketContact;
function getContactMap() {
    let out = new Map();
    for (let asteriskSocket of store.map.values()) {
        if (asteriskSocket === null) {
            continue;
        }
        out.set(asteriskSocket, (() => {
            let contact = getSocketContact(asteriskSocket);
            return (contact instanceof Promise) ? undefined : contact;
        })());
    }
    return out;
}
function getContacts(imsi) {
    let out = [];
    for (let contact of getContactMap().values()) {
        if (contact && (!imsi || contact.uaSim.imsi === imsi)) {
            out.push(contact);
        }
    }
    return out;
}
exports.getContacts = getContacts;
/** Close all asteriskSocket that has a contact registered to a IMSI */
function discardContactsRegisteredToSim(imsi) {
    for (let [asteriskSocket, contact] of getContactMap()) {
        if (!contact || contact.uaSim.imsi === imsi) {
            asteriskSocket.destroy();
        }
    }
}
exports.discardContactsRegisteredToSim = discardContactsRegisteredToSim;
