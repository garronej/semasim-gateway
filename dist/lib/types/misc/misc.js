"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
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
function generateUaId(o) {
    return JSON.stringify([o.instance, o.userEmail]);
}
exports.generateUaId = generateUaId;
function generateUaSimId(o) {
    return JSON.stringify([o.imsi, generateUaId(o.ua)]);
}
exports.generateUaSimId = generateUaSimId;
function areSameUaSims(o1, o2) {
    return generateUaSimId(o1) === generateUaSimId(o2);
}
exports.areSameUaSims = areSameUaSims;
function isValidEmail(email, mustBeLc = undefined) {
    const regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const regExpLcEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;
    return (typeof email === "string" &&
        email.match(mustBeLc ? regExpLcEmail : regExpEmail) !== null);
}
exports.isValidEmail = isValidEmail;
