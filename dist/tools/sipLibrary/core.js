"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("sip");
const _sdp_ = require("sip/sdp");
function makeStreamParser(handler, onFlood, maxBytesHeaders, maxContentLength) {
    let streamParser = sip.makeStreamParser(handler, (dataAsBinaryStr, floodType) => onFlood(Buffer.from(dataAsBinaryStr, "binary"), floodType), maxBytesHeaders, maxContentLength);
    return data => streamParser(data.toString("binary"));
}
exports.makeStreamParser = makeStreamParser;
function toData(sipPacket) {
    let dataAsBinaryString = sip.stringify(sipPacket);
    if (!!sipPacket.headers["record-route"]) {
        let split = dataAsBinaryString.split("\r\n");
        for (let i = 0; i < split.length; i++) {
            let match = split[i].match(/^Record-Route:(.+)$/);
            if (match) {
                split[i] = match[1]
                    .replace(/\s/g, "")
                    .split(",")
                    .map(v => `Record-Route: ${v}`)
                    .join("\r\n");
                break;
            }
        }
        dataAsBinaryString = split.join("\r\n");
    }
    return Buffer.from(dataAsBinaryString, "binary");
}
exports.toData = toData;
exports.parse = data => {
    let sipPacket = sip.parse(data.toString("binary"));
    if (!sipPacket.headers.via) {
        sipPacket.headers.via = [];
    }
    return sipPacket;
};
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
