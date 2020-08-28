"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFromContactUriParams = exports.buildParameter = void 0;
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
var key = "ua";
/**
 * Returns "ua=eyJ1c2VyRW1haWwiOiJqb3...cWw__"
 * Need to be called when creating a new jsSip UA instance.
 *
 *this.jsSipUa = new JsSIP.UA({
 *    ...
 *    "contact_uri": "12..2332@semasim.com" + ";" + buildUaParameter({...})
 *    ...
 *});
 */
function buildParameter(ua) {
    return key + "=" + urlSafeBase64encoderDecoder_1.urlSafeB64.enc(JSON.stringify(ua));
}
exports.buildParameter = buildParameter;
/**
 * contactUirParams=sipLibrary.parseUri(sipLibrary.getContact(sipRequestRegister)!.uri).params
 */
function parseFromContactUriParams(contactUirParams) {
    return JSON.parse(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(contactUirParams[key]));
}
exports.parseFromContactUriParams = parseFromContactUriParams;
