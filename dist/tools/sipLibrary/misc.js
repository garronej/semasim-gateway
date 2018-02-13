"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("./core");
//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
/** Safely set text based content (encoded in utf8 ) */
function setPacketContent(sipPacket, str) {
    let data = Buffer.from(str, "utf8");
    sipPacket.headers["content-length"] = data.byteLength;
    sipPacket.content = data.toString("binary");
}
exports.setPacketContent = setPacketContent;
/** Get the RAW content as buffer */
function getPacketContent(sipPacket) {
    return Buffer.from(sipPacket.content, "binary");
}
exports.getPacketContent = getPacketContent;
function readSrflxAddrInSdp(sdp) {
    for (let m_i of core.parseSdp(sdp).m) {
        if (m_i.media !== "audio")
            continue;
        for (let a_i of m_i.a) {
            let match = a_i.match(/^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/);
            if (match)
                return match[1];
        }
    }
    return undefined;
}
exports.readSrflxAddrInSdp = readSrflxAddrInSdp;
//TODO: only on gw remove ?
function isPlainMessageRequest(sipRequest) {
    return (sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/));
}
exports.isPlainMessageRequest = isPlainMessageRequest;
function parsePath(path) {
    const message = core.parse([
        `DUMMY _ SIP/2.0`,
        `Path: ${path}`,
        "\r\n"
    ].join("\r\n"));
    return message.headers.path;
}
exports.parsePath = parsePath;
function parseOptionTags(headerFieldValue) {
    if (!headerFieldValue)
        return [];
    return headerFieldValue.split(",").map(optionTag => optionTag.replace(/\s/g, ""));
}
exports.parseOptionTags = parseOptionTags;
function hasOptionTag(headers, headerField, optionTag) {
    let headerFieldValue = headers[headerField];
    let optionTags = parseOptionTags(headerFieldValue);
    return optionTags.indexOf(optionTag) >= 0;
}
exports.hasOptionTag = hasOptionTag;
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag))
        return;
    let optionTags = parseOptionTags(headers[headerField]);
    optionTags.push(optionTag);
    headers[headerField] = optionTags.join(", ");
}
exports.addOptionTag = addOptionTag;
function filterSdpCandidates(keep, sdp) {
    let shouldKeepCandidate = (candidateLine) => {
        return ((keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/)));
    };
    let parsedSdp = core.parseSdp(sdp);
    let arr = parsedSdp.m[0].a;
    for (let line of [...arr]) {
        if (!line.match(/^candidate/))
            continue;
        if (!shouldKeepCandidate(line)) {
            arr.splice(arr.indexOf(line), 1);
        }
    }
    return core.stringifySdp(sdp);
}
exports.filterSdpCandidates = filterSdpCandidates;
