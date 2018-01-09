"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_sipContact");
var PsContact;
(function (PsContact) {
    function stringifyMisc(misc) {
        var user_agent = (new Buffer(JSON.stringify(misc), "utf8")).toString("base64");
        return user_agent;
    }
    PsContact.stringifyMisc = stringifyMisc;
    function parseMisc(user_agent) {
        return JSON.parse((new Buffer(user_agent, "base64")).toString("utf8"));
    }
    PsContact.parseMisc = parseMisc;
    function buildContact(psContact) {
        var imsi = psContact.endpoint;
        var _a = parseMisc(psContact.user_agent), ua_instance = _a.ua_instance, ua_userEmail = _a.ua_userEmail, ua_platform = _a.ua_platform, ua_pushToken = _a.ua_pushToken, ua_software = _a.ua_software, connectionId = _a.connectionId;
        return {
            "id": psContact.id,
            "uri": psContact.uri.replace(/\^3B/g, ";"),
            "path": psContact.path.replace(/\^3B/g, ";"),
            connectionId: connectionId,
            "uaSim": {
                "ua": {
                    "instance": ua_instance,
                    "userEmail": ua_userEmail,
                    "platform": ua_platform,
                    "pushToken": ua_pushToken,
                    "software": ua_software
                },
                imsi: imsi
            }
        };
    }
    PsContact.buildContact = buildContact;
})(PsContact = exports.PsContact || (exports.PsContact = {}));
var Contact;
(function (Contact) {
    function sanityCheck(o) {
        return (o instanceof Object &&
            typeof o.id === "string" &&
            typeof o.uri === "string" &&
            typeof o.path === "string" &&
            typeof o.connectionId === "number" &&
            UaSim.sanityCheck(o.uaSim));
    }
    Contact.sanityCheck = sanityCheck;
    var UaSim;
    (function (UaSim) {
        function sanityCheck(o) {
            return (o instanceof Object &&
                Ua.sanityCheck(o.ua) &&
                chan_dongle_extended_client_1.DongleController.isImsiWellFormed(o.imsi));
        }
        UaSim.sanityCheck = sanityCheck;
        function areSame(o1, o2) {
            return id(o1) === id(o2);
        }
        UaSim.areSame = areSame;
        function id(o) {
            return JSON.stringify([o.imsi, Ua.id(o.ua)]);
        }
        UaSim.id = id;
        var Ua;
        (function (Ua) {
            function sanityCheck(o) {
                return (o instanceof Object &&
                    typeof o.instance === "string" &&
                    _constants_1.c.shared.isValidEmail(o.userEmail, "MUST BE LOWER CASE") &&
                    platform.sanityCheck(o.platform) &&
                    typeof o.pushToken === "string" &&
                    typeof o.software === "string");
            }
            Ua.sanityCheck = sanityCheck;
            var platform;
            (function (platform) {
                function sanityCheck(o) {
                    return (typeof o === "string" && (o === "android" ||
                        o === "iOS" ||
                        o === "other"));
                }
                platform.sanityCheck = sanityCheck;
            })(platform = Ua.platform || (Ua.platform = {}));
            function id(o) {
                return JSON.stringify([o.instance, o.userEmail]);
            }
            Ua.id = id;
        })(Ua = UaSim.Ua || (UaSim.Ua = {}));
    })(UaSim = Contact.UaSim || (Contact.UaSim = {}));
})(Contact = exports.Contact || (exports.Contact = {}));
