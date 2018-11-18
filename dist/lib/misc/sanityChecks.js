"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
//TODO: rename sanityCheck.
var sanityChecks;
(function (sanityChecks) {
    function contact(o) {
        return (o instanceof Object &&
            typeof o.uri === "string" &&
            typeof o.path === "string" &&
            typeof o.connectionId === "string" &&
            uaSim(o.uaSim));
    }
    sanityChecks.contact = contact;
    function uaSim(o) {
        return (o instanceof Object &&
            ua(o.ua) &&
            dcSanityChecks.imsi(o.imsi));
    }
    sanityChecks.uaSim = uaSim;
    function ua(o) {
        return (o instanceof Object &&
            typeof o.instance === "string" &&
            isValidEmail(o.userEmail, "MUST BE LOWER CASE") &&
            platform(o.platform) &&
            typeof o.pushToken === "string" &&
            typeof o.software === "string");
    }
    sanityChecks.ua = ua;
    function platform(o) {
        return (typeof o === "string" && (o === "android" ||
            o === "iOS" ||
            o === "web"));
    }
    sanityChecks.platform = platform;
})(sanityChecks = exports.sanityChecks || (exports.sanityChecks = {}));
function isValidEmail(email, mustBeLc) {
    if (mustBeLc === void 0) { mustBeLc = undefined; }
    var regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var regExpLcEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;
    return (typeof email === "string" &&
        email.match(mustBeLc ? regExpLcEmail : regExpEmail) !== null);
}
exports.isValidEmail = isValidEmail;
