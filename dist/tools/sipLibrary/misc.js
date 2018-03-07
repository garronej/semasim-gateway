"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("./core");
//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";
function makeBufferStreamParser(handler, onFlood, maxBytesHeaders, maxContentLength) {
    let streamParser = core.makeStreamParser(handler, onFlood, maxBytesHeaders, maxContentLength);
    return data => streamParser(data.toString("binary"));
}
exports.makeBufferStreamParser = makeBufferStreamParser;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
function clonePacket(sipPacket) {
    return core.parse(core.stringify(sipPacket));
}
exports.clonePacket = clonePacket;
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
function isPlainMessageRequest(sipRequest, withAuth = undefined) {
    return (sipRequest.method === "MESSAGE" &&
        (!withAuth || "authorization" in sipRequest.headers) &&
        sipRequest.headers["content-type"].toLowerCase().match(/^text\/plain/));
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
function stringifyPath(parsedPath) {
    const message = core.parse([
        `DUMMY _ SIP/2.0`,
        "\r\n"
    ].join("\r\n"));
    message.headers.path = parsedPath;
    return core.stringify(message).match(/\r\nPath:\ +(.*)\r\n/)[1];
}
exports.stringifyPath = stringifyPath;
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
/** Do nothing if already present */
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag)) {
        return;
    }
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
function getContact(sipRequest) {
    if (!sipRequest.headers.contact || !sipRequest.headers.contact.length) {
        return undefined;
    }
    return sipRequest.headers.contact[0];
}
exports.getContact = getContact;
function isResponse(sipRequestNextHop, sipResponse) {
    return sipResponse.headers.via[0].params["branch"] ===
        sipRequestNextHop.headers.via[0].params["branch"];
}
exports.isResponse = isResponse;
function buildNextHopPacket(socket, sipPacket) {
    sipPacket = clonePacket(sipPacket);
    if (matchRequest(sipPacket)) {
        let sipRequest = sipPacket;
        buildNextHopPacket.popRoute(sipRequest);
        if (sipRequest.method === "REGISTER") {
            let sipRequestRegister = sipRequest;
            buildNextHopPacket.pushPath(socket, sipRequestRegister);
        }
        else {
            if (getContact(sipRequest)) {
                buildNextHopPacket.pushRecordRoute(socket, sipRequest);
            }
        }
        buildNextHopPacket.pushVia(socket, sipRequest);
        buildNextHopPacket.decrementMaxForward(sipRequest);
    }
    else {
        let sipResponse = sipPacket;
        buildNextHopPacket.rewriteRecordRoute(socket, sipResponse);
        buildNextHopPacket.popVia(sipResponse);
    }
    return sipPacket;
}
exports.buildNextHopPacket = buildNextHopPacket;
/** pop and shift refer to stack operations */
(function (buildNextHopPacket) {
    function buildLocalAoRWithParsedUri(socket) {
        return {
            "uri": Object.assign({}, core.parseUri(`sip:${socket.localAddress}:${socket.localPort}`), { "params": {
                    "transport": socket.protocol,
                    "lr": null
                } }),
            "params": {}
        };
    }
    function popRoute(sipRequest) {
        if (!sipRequest.headers.route) {
            return;
        }
        sipRequest.headers.route.shift();
        //For tests
        if (!sipRequest.headers.route.length) {
            delete sipRequest.headers.route;
        }
    }
    buildNextHopPacket.popRoute = popRoute;
    function pushPath(socket, sipRequestRegister) {
        addOptionTag(sipRequestRegister.headers, "supported", "path");
        if (!sipRequestRegister.headers.path) {
            sipRequestRegister.headers.path = [];
        }
        sipRequestRegister.headers.path.unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushPath = pushPath;
    function pushRecordRoute(socket, sipRequest) {
        if (!sipRequest.headers["record-route"]) {
            sipRequest.headers["record-route"] = [];
        }
        sipRequest.headers["record-route"].unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushRecordRoute = pushRecordRoute;
    function pushVia(socket, sipRequest) {
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": socket.protocol,
            "host": socket.localAddress,
            "port": socket.localPort,
            "params": {
                "branch": (() => {
                    let via = sipRequest.headers.via;
                    return via.length ? `z9hG4bK-${via[0].params["branch"]}` : core.generateBranch();
                })(),
                "rport": null
            }
        });
    }
    buildNextHopPacket.pushVia = pushVia;
    function popVia(sipResponse) {
        sipResponse.headers.via.shift();
    }
    buildNextHopPacket.popVia = popVia;
    /** Need to be called before Via is poped */
    function rewriteRecordRoute(socket, sipResponse) {
        let recordRoute = sipResponse.headers["record-route"];
        if (recordRoute) {
            recordRoute[recordRoute.length - sipResponse.headers.via.length + 1] = buildLocalAoRWithParsedUri(socket);
        }
    }
    buildNextHopPacket.rewriteRecordRoute = rewriteRecordRoute;
    function decrementMaxForward(sipRequest) {
        let maxForwards = parseInt(sipRequest.headers["max-forwards"]);
        if (isNaN(maxForwards)) {
            throw new Error("Max-Forwards not defined");
        }
        sipRequest.headers["max-forwards"] = `${maxForwards - 1}`;
    }
    buildNextHopPacket.decrementMaxForward = decrementMaxForward;
})(buildNextHopPacket = exports.buildNextHopPacket || (exports.buildNextHopPacket = {}));
