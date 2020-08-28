"use strict";
/* NOTE: Used in the browser. */
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cid = exports.readImsi = void 0;
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
//NOTE: Transpiled to ES5
var sipLibrary = require("ts-sip");
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
/**
 *
 * connectionId:
 *
 * An uniq id of every UA connection to the backend
 * Should be included in every sip packet.
 * The token enclose a timestamp of when the
 * UA connection to the backend was established,
 * the public address of the UA and the source
 * port the UA used to connect.
 *
 * */
var cid;
(function (cid) {
    /** on backend when ua connect */
    function generate(uaSocket, timestamp) {
        if (timestamp === void 0) { timestamp = Date.now(); }
        return urlSafeBase64encoderDecoder_1.urlSafeB64.enc(timestamp + ":" + uaSocket.remoteAddress + ":" + uaSocket.remotePort);
    }
    cid.generate = generate;
    function parse(connectionId) {
        var _a = __read(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(connectionId).split(":"), 3), a = _a[0], b = _a[1], c = _a[2];
        return {
            "timestamp": parseInt(a),
            "uaSocket": {
                "remoteAddress": b,
                "remotePort": parseInt(c)
            }
        };
    }
    cid.parse = parse;
    var key = "connection_id";
    /**
     * Include a connection id in a sipRequest.
     * This must be applied to every new sip request.
     * ( No need to include the connection id on sip response
     * as it is already present )
     */
    function set(sipRequestNextHop, connectionId) {
        sipRequestNextHop.headers[isRequestFromClient(sipRequestNextHop) ? "from" : "to"].params[key] = connectionId;
    }
    cid.set = set;
    /** Read the connection id */
    function read(sipPacket) {
        return sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].params[key];
    }
    cid.read = read;
})(cid = exports.cid || (exports.cid = {}));
