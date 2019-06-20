"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
var RegistrationParams;
(function (RegistrationParams) {
    var key = "registration_params";
    /** returns registration_params=eyJ1c2VyRW1haWwiOiJqb3...cWw__ */
    function build(registrationParams) {
        return key + "=" + urlSafeBase64encoderDecoder_1.urlSafeB64.enc(JSON.stringify(registrationParams));
    }
    RegistrationParams.build = build;
    function parse(contactUirParams, contactAorParams) {
        return JSON.parse(urlSafeBase64encoderDecoder_1.urlSafeB64.dec((contactUirParams[key] || contactAorParams[key])));
    }
    RegistrationParams.parse = parse;
})(RegistrationParams = exports.RegistrationParams || (exports.RegistrationParams = {}));
;
