"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var sipLibrary = require("ts-sip");
var ts_events_extended_1 = require("ts-events-extended");
var misc = require("./misc");
var backendRemoteApiCaller = require("./toBackend/remoteApiCaller");
var dbAsterisk = require("./dbAsterisk");
//TODO: create proxy
exports.evtContactRegistration = new ts_events_extended_1.SyncEvent();
function getContacts(imsi) {
    return contacts.get()
        .filter(function (_a) {
        var contact = _a.contact;
        return !!imsi ? (contact.uaSim.imsi === imsi) : true;
    })
        .map(function (_a) {
        var contact = _a.contact;
        return contact;
    });
}
exports.getContacts = getContacts;
/** Close all asteriskSocket that has a contact registered to a IMSI */
function discardContactsRegisteredToSim(imsi) {
    var e_1, _a;
    try {
        for (var _b = __values(contacts.get()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = _c.value, contact = _d.contact, asteriskSocket = _d.asteriskSocket;
            if (contact.uaSim.imsi === imsi) {
                asteriskSocket.destroy([
                    "need password renewal or sim not registered, closing all ast",
                    "sockets that have a contact registered to imsi: " + imsi
                ].join(" "));
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
exports.discardContactsRegisteredToSim = discardContactsRegisteredToSim;
var contacts;
(function (contacts) {
    var map = new Map();
    contacts.evtExpiredContact = new ts_events_extended_1.SyncEvent();
    function _delete(contact) {
        var entry = map.get(contact);
        if (entry) {
            clearTimeout(entry.timer);
        }
        map.delete(contact);
    }
    contacts._delete = _delete;
    function setOrRefresh(contact, asteriskSocket, timeout) {
        _delete(contact);
        var timer = setTimeout(function () {
            map.delete(contact);
            contacts.evtExpiredContact.post({ contact: contact, asteriskSocket: asteriskSocket });
        }, timeout);
        timer.unref();
        map.set(contact, { timer: timer, asteriskSocket: asteriskSocket });
    }
    contacts.setOrRefresh = setOrRefresh;
    function get() {
        var e_2, _a;
        var out = [];
        try {
            for (var map_1 = __values(map), map_1_1 = map_1.next(); !map_1_1.done; map_1_1 = map_1.next()) {
                var _b = __read(map_1_1.value, 2), contact = _b[0], asteriskSocket = _b[1].asteriskSocket;
                out.push({ contact: contact, asteriskSocket: asteriskSocket });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (map_1_1 && !map_1_1.done && (_a = map_1.return)) _a.call(map_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return out;
    }
    contacts.get = get;
})(contacts || (contacts = {}));
contacts.evtExpiredContact.attach(function (_a) {
    var contact = _a.contact, asteriskSocket = _a.asteriskSocket;
    asteriskSocket.destroy("Contact associated to connection expired");
    backendRemoteApiCaller.forceContactToRegister(contact);
});
function onContactRegistered(contact, expire, asteriskSocket) {
    asteriskSocket.evtClose.attachOnce(function () {
        contacts._delete(contact);
        dbAsterisk.deleteContact(contact);
    });
    contacts.get().find(function (entry) {
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
    var imsi;
    var connectionId;
    asteriskSocket.evtPacketPreWrite.attachOnce(sipLibrary.matchRequest, function (sipRequest) {
        imsi = misc.readImsi(sipRequest);
        connectionId = misc.cid.read(sipRequest);
    });
    var purgedContactUri;
    asteriskSocket.evtPacketPreWrite.attachOnce(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)); }, function (sipRequest) {
        var parsedUri = sipLibrary.parseUri(sipLibrary.getContact(sipRequest).uri);
        parsedUri.params = {
            "mk": ("" + misc.cid.parse(connectionId).timestamp).match(/([0-9]{6})$/)[1]
        };
        purgedContactUri = sipLibrary.stringifyUri(parsedUri);
    });
    var contact;
    var expire;
    asteriskSocket.evtPacketPreWrite.attachOnce(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER"); }, function (sipRequestRegister) {
        var _a = __read((function () {
            var contactAor = sipLibrary.getContact(sipRequestRegister);
            return [
                contactAor.params,
                sipLibrary.parseUri(contactAor.uri).params
            ];
        })(), 2), aorParams = _a[0], uriParams = _a[1];
        contact = {
            "uri": purgedContactUri,
            connectionId: connectionId,
            "path": sipLibrary.stringifyPath(sipRequestRegister.headers.path),
            "uaSim": {
                imsi: imsi,
                "ua": {
                    "instance": aorParams["+sip.instance"],
                    "userEmail": misc.urlSafeB64.dec((uriParams["enc_email"] ||
                        aorParams["enc_email"])),
                    "platform": (function () {
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
    var evtRegistered = new ts_events_extended_1.VoidSyncEvent();
    asteriskSocket.evtPacketPreWrite.attach(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER" &&
        sipPacket.headers["authorization"]); }, function (sipRequestRegister) {
        return asteriskSocket.evtResponse.attachOnce(function (sipResponse) { return sipLibrary.isResponse(sipRequestRegister, sipResponse); }, function (_a) {
            var status = _a.status;
            if (status !== 200) {
                return;
            }
            onContactRegistered(contact, expire, asteriskSocket);
            if (!evtRegistered.postCount) {
                evtRegistered.post();
            }
        });
    });
    asteriskSocket.evtPacketPreWrite.attach(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)); }, function (sipPacket) { return sipLibrary.getContact(sipPacket).uri = purgedContactUri; });
    return new Promise(function (resolve) { return evtRegistered
        .waitFor(6001)
        .then(function () { return resolve(contact); })
        .catch(function () { return asteriskSocket.destroy("This connection did not register a contact in time"); }); });
}
exports.handleAsteriskSocket = handleAsteriskSocket;
