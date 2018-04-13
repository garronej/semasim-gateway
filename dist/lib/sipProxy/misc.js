"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stringTransform = require("transfer-tools/dist/lib/stringTransform");
const sipLibrary = require("ts-sip");
/**
 * Return true if it's a sipRequest originated of UA
 * or if it's a sipResponse of a request originated by UA.
 * */
function isRequestFromClient(sipPacket) {
    return sipPacket.headers.via[sipPacket.headers.via.length - 1].protocol !== "TCP";
}
function readImsi(sipPacket) {
    return sipLibrary.parseUri(sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].uri).user.match(/^([0-9]{15})/)[1];
}
exports.readImsi = readImsi;
var cid;
(function (cid) {
    const { enc, dec } = stringTransform.transcode("base64", { "=": "_" });
    /** on backend on client connection */
    function generate(clientSocket, timestamp = Date.now()) {
        return enc(`${timestamp}:${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
    }
    cid.generate = generate;
    function parse(connectionId) {
        let [a, b, c] = dec(connectionId).split(":");
        return {
            "timestamp": parseInt(a),
            "clientSocketRemoteAddress": b,
            "clientSocketRemotePort": parseInt(c)
        };
    }
    cid.parse = parse;
    const key = "connection_id";
    /** To set on request from asteriskSocket (gw) and from clientSocket (backend) */
    function set(sipRequestNextHop, connectionId) {
        sipRequestNextHop.headers[isRequestFromClient(sipRequestNextHop) ? "from" : "to"].params[key] = connectionId;
    }
    cid.set = set;
    /** read when ever we need to root a packet */
    function read(sipPacket) {
        return sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].params[key];
    }
    cid.read = read;
})(cid = exports.cid || (exports.cid = {}));
