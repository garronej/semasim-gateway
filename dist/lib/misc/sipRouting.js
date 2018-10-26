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
    const { enc, dec } = stringTransform.transcode("base64", { "=": "_" });
    /** on backend when ua connect */
    function generate(uaSocket, timestamp = Date.now()) {
        return enc(`${timestamp}:${uaSocket.remoteAddress}:${uaSocket.remotePort}`);
    }
    cid.generate = generate;
    function parse(connectionId) {
        const [a, b, c] = dec(connectionId).split(":");
        return {
            "timestamp": parseInt(a),
            "uaSocket": {
                "remoteAddress": b,
                "remotePort": parseInt(c)
            }
        };
    }
    cid.parse = parse;
    const key = "connection_id";
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
