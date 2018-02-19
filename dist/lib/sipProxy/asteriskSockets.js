"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbAsterisk = require("../dbAsterisk");
const types = require("../types");
const sipApiBackend = require("./../sipApiBackedClientImplementation");
const ts_events_extended_1 = require("ts-events-extended");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/asteriskSockets");
exports.evtContactRegistration = new ts_events_extended_1.SyncEvent();
/** map connectionId+imsi => asteriskSocket */
const map = new Map();
function set(connectionId, imsi, socket) {
    let key = `${connectionId}${imsi}`;
    map.set(key, socket);
    socket.evtClose.attachOnce(() => map.set(key, null));
    socket.misc["prContact"] = new Promise(resolve => dbAsterisk.evtNewContact.waitFor(contact => (contact.connectionId === connectionId &&
        contact.uaSim.imsi === imsi), 6001).then(contact => {
        const boundTo = [];
        socket.evtClose.attachOnce(() => {
            dbAsterisk.evtExpiredContact.detach(boundTo);
            dbAsterisk.deleteContact(contact);
        });
        dbAsterisk.evtExpiredContact.attachOnce(expiredContact => expiredContact.id === contact.id, boundTo, () => {
            debug("expired contact");
            socket.destroy();
            sipApiBackend.forceContactToRegister(contact);
        });
        for (let [socket_i, contact_i] of getContactMap()) {
            if (contact_i && types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {
                debug("ua re-register with an other connection");
                socket_i.destroy();
                break;
            }
        }
        socket.misc["contact"] = contact;
        exports.evtContactRegistration.post(contact);
        resolve(contact);
    }).catch(() => socket.destroy()));
}
exports.set = set;
function get(connectionId, imsi) {
    return map.get(`${connectionId}${imsi}`);
}
exports.get = get;
function getSocketContact(socket) {
    return socket.misc["contact"] || socket.misc["prContact"];
}
exports.getSocketContact = getSocketContact;
function getContactMap() {
    let out = new Map();
    for (let socket of map.values()) {
        if (socket === null) {
            continue;
        }
        out.set(socket, (() => {
            let contact = getSocketContact(socket);
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
function flush(imsi) {
    for (let [socket, contact] of getContactMap()) {
        if (!imsi || !contact || contact.uaSim.imsi === imsi) {
            socket.destroy();
        }
    }
}
exports.flush = flush;
