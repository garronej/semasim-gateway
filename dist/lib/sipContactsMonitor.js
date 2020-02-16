"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
var ts_evt_1 = require("ts-evt");
var sipRouting = require("./misc/sipRouting");
var misc_1 = require("./misc/misc");
var dbAsterisk = require("./dbAsterisk");
var serializedUaObjectCarriedOverSipContactParameter = require("./misc/serializedUaObjectCarriedOverSipContactParameter");
var crypto = require("crypto");
var logger = require("logger");
var debug = logger.debugFactory();
//TODO: create proxy
exports.evtContactRegistration = new ts_evt_1.Evt();
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
function discardContactsRegisteredToSim(imsi, asteriskSocketsDestroyReason) {
    var e_1, _a;
    try {
        for (var _b = __values(contacts.get()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = _c.value, contact = _d.contact, asteriskSocket = _d.asteriskSocket;
            if (contact.uaSim.imsi === imsi) {
                asteriskSocket.destroy(asteriskSocketsDestroyReason);
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
    contacts.evtExpiredContact = new ts_evt_1.Evt();
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
    return asteriskSocket.destroy("Contact " + contact.uri + " that was associated associated to this connection has expired");
});
function onContactRegistered(contact, expire, asteriskSocket) {
    var e_3, _a;
    asteriskSocket.evtClose.attachOnce(function () {
        contacts._delete(contact);
        dbAsterisk.deleteContact(contact);
    });
    var sipContactRegistrationType = "NEW REGISTRATION";
    try {
        for (var _b = __values(contacts.get()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = _c.value, contact_i = _d.contact, asteriskSocket_i = _d.asteriskSocket;
            if (contact_i === contact) {
                sipContactRegistrationType = expire === 0 ? "UNREGISTER" : "REGISTRATION REFRESH";
                break;
            }
            if (misc_1.areSameUaSims(contact.uaSim, contact_i.uaSim)) {
                asteriskSocket_i.destroy("UA re-registered with an other connection");
                sipContactRegistrationType =
                    "NEW REGISTRATION OF AN UA(SIM) THAT HAD A REGISTRATION STILL VALID ON AN OTHER CONNECTION";
                break;
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    debug(JSON.stringify({
        sipContactRegistrationType: sipContactRegistrationType,
        expire: expire,
        contact: contact
    }, null, 2));
    contacts.setOrRefresh(contact, asteriskSocket, expire * 1000);
    if (expire === 0) {
        return;
    }
    exports.evtContactRegistration.post(contact);
}
/** should be called against every new asterisk socket */
function handleAsteriskSocket(asteriskSocket) {
    var imsi;
    var connectionId;
    asteriskSocket.evtPacketPreWrite.attachOnce(sipLibrary.matchRequest, function (sipRequest) {
        imsi = sipRouting.readImsi(sipRequest);
        connectionId = sipRouting.cid.read(sipRequest);
    });
    /*NOTE: Asterisk use a fixed length buffer for storing contact uri
    as a result we have to first extract the information carried by the
    contact then remove the parameters so it does not overflow asterisk
    buffer. We still need the contact uri to be uniq so we add a mark. */
    var purgedContactUri;
    asteriskSocket.evtPacketPreWrite.attachOnce(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)); }, function (sipRequest) {
        var uri = sipLibrary.getContact(sipRequest).uri;
        var parsedUri = sipLibrary.parseUri(uri);
        /*NOTE: Each asteriskSocket have an single sip contact registration
        associated to it. and an asterisk socket is identified by a connectionId and an imsi
        so the contact uri must be unique across imsi + connectionId
        */
        parsedUri.params = {
            "mk": crypto.createHash("md5")
                .update(uri + connectionId)
                .digest("hex")
                .substring(0, 8)
        };
        purgedContactUri = sipLibrary.stringifyUri(parsedUri);
    });
    var contact;
    //TODO: What if an old client connect, or an attacked provide malformed params ?
    asteriskSocket.evtPacketPreWrite.attachOnce(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER"); }, function (sipRequestRegister) { return contact = {
        "uri": purgedContactUri,
        connectionId: connectionId,
        "path": sipLibrary.stringifyPath(sipRequestRegister.headers.path),
        "uaSim": {
            imsi: imsi,
            "ua": serializedUaObjectCarriedOverSipContactParameter.parseFromContactUriParams(sipLibrary.parseUri(sipLibrary.getContact(sipRequestRegister).uri).params)
        }
    }; });
    var evtFirstRegistration = new ts_evt_1.VoidEvt();
    asteriskSocket.evtPacketPreWrite.attach(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        sipPacket.method === "REGISTER" &&
        !!sipPacket.headers["authorization"]); }, function (sipRequestRegister) {
        return asteriskSocket.evtResponse.attachOnce(function (sipResponse) { return sipLibrary.isResponse(sipRequestRegister, sipResponse); }, function (sipResponse) {
            if (sipResponse.status !== 200) {
                return;
            }
            onContactRegistered(contact, parseInt(sipResponse.headers["expires"]), asteriskSocket);
            if (evtFirstRegistration.postCount) {
                return;
            }
            evtFirstRegistration.post();
        });
    });
    asteriskSocket.evtPacketPreWrite.attach(function (sipPacket) { return (sipLibrary.matchRequest(sipPacket) &&
        !!sipLibrary.getContact(sipPacket)); }, function (sipPacket) { return sipLibrary.getContact(sipPacket).uri = purgedContactUri; });
    return new Promise(function (resolve) { return evtFirstRegistration
        .waitFor(6001)
        .then(function () { return resolve(contact); })
        .catch(function () { return asteriskSocket.destroy("This connection did not register a contact in time"); }); });
}
exports.handleAsteriskSocket = handleAsteriskSocket;
