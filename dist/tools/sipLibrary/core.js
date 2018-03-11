"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("sip");
const _sdp_ = require("sip/sdp");
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
exports.makeStreamParser = sip.makeStreamParser;
exports.stringify = sip.stringify;
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parse = rawSipPacket => {
    let sipPacket = sip.parse(rawSipPacket);
    if (!sipPacket.headers.via) {
        sipPacket.headers.via = [];
    }
    return sipPacket;
};
