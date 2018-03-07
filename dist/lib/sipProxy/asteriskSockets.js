"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbAsterisk = require("../db/asterisk");
const types = require("../types");
const backendSocket = require("./backendSocket");
const ts_events_extended_1 = require("ts-events-extended");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/asteriskSockets");
exports.evtContactRegistration = new ts_events_extended_1.SyncEvent();
/** map connectionId+imsi => asteriskSocket */
const map = new Map();
var _protected;
(function (_protected) {
    let Key;
    (function (Key) {
        function getId(key) {
            return `${key.connectionId};${key.imsi}`;
        }
        Key.getId = getId;
    })(Key = _protected.Key || (_protected.Key = {}));
    function set(key, socket) {
        map.set(Key.getId(key), socket);
        socket.evtClose.attachOncePrepend(() => map.set(Key.getId(key), null));
        let { connectionId, imsi } = key;
        socket.misc["__prContact__"] = new Promise(resolve => dbAsterisk.evtNewContact.waitFor(contact => (contact.connectionId === connectionId &&
            contact.uaSim.imsi === imsi), 6001).then(contact => {
            const boundTo = [];
            socket.evtClose.attachOnce(() => {
                dbAsterisk.evtExpiredContact.detach(boundTo);
                dbAsterisk.deleteContact(contact);
            });
            dbAsterisk.evtExpiredContact.attachOnce(expiredContact => expiredContact.id === contact.id, boundTo, () => {
                debug("expired contact");
                socket.destroy();
                backendSocket.remoteApi.forceContactToRegister(contact);
            });
            for (let [socket_i, contact_i] of getContactMap()) {
                if (contact_i && types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {
                    debug("ua re-register with an other connection");
                    socket_i.destroy();
                    break;
                }
            }
            socket.misc["__contact__"] = contact;
            exports.evtContactRegistration.post(contact);
            resolve(contact);
        }).catch(() => socket.destroy()));
    }
    _protected.set = set;
    /** null represent an expired connection */
    function get(key) {
        return map.get(Key.getId(key));
    }
    _protected.get = get;
    function getSocketContact(socket) {
        return socket.misc["__contact__"] || socket.misc["__prContact__"];
    }
    _protected.getSocketContact = getSocketContact;
})(_protected = exports._protected || (exports._protected = {}));
function getContactMap() {
    let out = new Map();
    for (let socket of map.values()) {
        if (socket === null) {
            continue;
        }
        out.set(socket, (() => {
            let contact = _protected.getSocketContact(socket);
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
