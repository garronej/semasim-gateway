"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbAsterisk = require("../dbAsterisk");
const types = require("../types");
const sipApiBackend = require("./../sipApiBackedClientImplementation");
require("colors");
const _debug = require("debug");
let debug = _debug("_sipProxy/asteriskSockets");
var asteriskSockets;
(function (asteriskSockets) {
    const map = new Map();
    function getContacts(imsi) {
        let match;
        if (imsi) {
            match = contact => contact.uaSim.imsi === imsi;
        }
        else {
            match = () => true;
        }
        let contacts = [];
        for (let socket of map.values()) {
            if (socket === null)
                continue;
            let contact = socket.misc["contact"];
            if (!contact)
                continue;
            if (!match(contact))
                continue;
            contacts.push(contact);
        }
        return contacts;
    }
    asteriskSockets.getContacts = getContacts;
    function set(connectionId, imsi, socket) {
        let key = `${connectionId}${imsi}`;
        socket.evtClose.attachOnce(() => map.set(key, null));
        let prContact = dbAsterisk.evtNewContact.attachOncePrepend(contact => (contact.connectionId === connectionId &&
            contact.uaSim.imsi === imsi), 6000, contact => {
            socket.evtClose.attachOnce(() => {
                dbAsterisk.evtExpiredContact.detach(prContact);
                dbAsterisk.deleteContact(contact);
            });
            dbAsterisk.evtExpiredContact.attachOnce(expiredContact => expiredContact.id === contact.id, prContact, () => {
                debug("expired contact");
                socket.destroy();
                sipApiBackend.forceContactToRegister(contact);
            });
            for (let socket_i of map.values()) {
                if (socket_i === null)
                    continue;
                let contact_i = socket_i.misc["contact"];
                if (!contact_i)
                    continue;
                if (types.misc.areSameUaSims(contact_i.uaSim, contact.uaSim)) {
                    debug("ua re-register with an other connection");
                    socket_i.destroy();
                    break;
                }
            }
            socket.misc["contact"] = contact;
        });
        prContact.catch(() => socket.destroy());
        socket.misc["prContact"] = prContact;
        map.set(key, socket);
    }
    asteriskSockets.set = set;
    function get(connectionId, imsi) {
        return map.get(`${connectionId}${imsi}`);
    }
    asteriskSockets.get = get;
    function getContact(socket) {
        return socket.misc["contact"] || socket.misc["prContact"];
    }
    asteriskSockets.getContact = getContact;
    function flush() {
        for (let socket of map.values()) {
            if (socket === null)
                continue;
            socket.destroy();
        }
    }
    asteriskSockets.flush = flush;
})(asteriskSockets = exports.asteriskSockets || (exports.asteriskSockets = {}));
