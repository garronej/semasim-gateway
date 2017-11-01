"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var sip = require("sip");
var _sdp_ = require("sip/sdp");
var _debug = require("debug");
var debug = _debug("_tools/sipLibrary");
exports.regIdKey = "reg-id";
exports.instanceIdKey = "+sip.instance";
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
//TODO Only on the gateway side, remove ?
function overwriteGlobalAndAudioAddrInSdpCandidates(sdp) {
    var getSrflxAddr = function () {
        try {
            for (var _a = __values(sdp.m), _b = _a.next(); !_b.done; _b = _a.next()) {
                var m_i = _b.value;
                if (m_i.media !== "audio")
                    continue;
                try {
                    for (var _c = __values(m_i.a), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var a_i = _d.value;
                        var match = a_i.match(/^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/);
                        if (match)
                            return match[1];
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return "";
        var e_2, _f, e_1, _e;
    };
    var srflxAddr = getSrflxAddr();
    if (!srflxAddr) {
        console.log("No srflx candidate was present in the offer");
        return;
    }
    //TODO: I think linphone is expecting a second c line witch this implementation of SDP parser does not support...
    sdp.c.address = srflxAddr;
    //TODO: we this should be removable
    sdp.o.address = srflxAddr;
    //TODO: see if need to update port in m as well because it may fail on NAT that change port mapping
    /*

    Asterisk sends:

    v=0
    o=- 947913108 947913108 IN IP4 192.168.0.20
    s=Asterisk
    c=IN IP4 192.168.0.20
    t=0 0
    m=audio 27802 RTP/AVP 8 0 101
    a=ice-ufrag:733aedd91cdc7ff0001e4b0b6a9b0fcc
    a=ice-pwd:4df63e726aeaeb030fdf2945787aba76
    a=candidate:Hc0a80014 1 UDP 2130706431 192.168.0.20 27802 typ host
    a=candidate:S5140886d 1 UDP 1694498815 81.64.136.109 27802 typ srflx raddr 192.168.0.20 rport 27802
    a=candidate:Hc0a80014 2 UDP 2130706430 192.168.0.20 27803 typ host
    a=candidate:S5140886d 2 UDP 1694498814 81.64.136.109 27803 typ srflx raddr 192.168.0.20 rport 27803
    a=rtpmap:8 PCMA/8000
    a=rtpmap:0 PCMU/8000
    a=rtpmap:101 telephone-event/8000
    a=fmtp:101 0-16
    a=ptime:20
    a=maxptime:150
    a=sendrecv

    Linphone sends:

    v=0
    o=358880032664586 1891 2518 IN IP4 192.168.0.16
    s=Talk
    c=IN IP4 192.168.0.16
    b=AS:380
    t=0 0
    a=ice-pwd:9b07eb9ded44692c868621e7
    a=ice-ufrag:27435913
    m=audio 7076 RTP/AVP 8 0 101
    c=IN IP4 81.64.136.109
    a=rtpmap:101 telephone-event/8000
    a=candidate:1 1 UDP 2130706431 192.168.0.16 7076 typ host
    a=candidate:1 2 UDP 2130706430 192.168.0.16 7077 typ host
    a=candidate:2 1 UDP 1694498815 81.64.136.109 7076 typ srflx raddr 192.168.0.16 rport 7076
    a=candidate:2 2 UDP 1694498814 81.64.136.109 7077 typ srflx raddr 192.168.0.16 rport 7077
    */
}
exports.overwriteGlobalAndAudioAddrInSdpCandidates = overwriteGlobalAndAudioAddrInSdpCandidates;
//TODO: only on gw remove ?
function isPlainMessageRequest(sipRequest) {
    return (sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/));
}
exports.isPlainMessageRequest = isPlainMessageRequest;
exports.makeStreamParser = sip.makeStreamParser;
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = /** @class */ (function () {
    function Socket(connection, timeoutDelay) {
        var _this = this;
        this.connection = connection;
        this.evtPacket = new ts_events_extended_1.SyncEvent();
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtTimeout = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.__localPort__ = NaN;
        this.__remotePort__ = NaN;
        this.__localAddress__ = undefined;
        this.__remoteAddress__ = undefined;
        this.setKeepAlive = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.connection.setKeepAlive.apply(_this.connection, inputs);
        };
        var streamParser = exports.makeStreamParser(function (sipPacket) {
            _this.evtPacket.post(sipPacket);
            if (matchRequest(sipPacket))
                _this.evtRequest.post(sipPacket);
            else
                _this.evtResponse.post(sipPacket);
        }, function () { return _this.connection.emit("error", new Error("Flood")); }, Socket.maxBytesHeaders, Socket.maxContentLength);
        connection
            .setMaxListeners(Infinity)
            .once("error", function (error) {
            debug("Socket error", error);
            _this.connection.emit("close", true);
        })
            .once("close", function (had_error) {
            if (timeoutDelay)
                clearTimeout(_this.timer);
            _this.connection.destroy();
            _this.evtClose.post(had_error);
        })
            .on("data", function (data) {
            if (timeoutDelay) {
                clearTimeout(_this.timer);
                _this.timer = setTimeout(function () { return _this.evtTimeout.post(); }, timeoutDelay);
            }
            var dataAsBinaryString = data.toString("binary");
            _this.evtData.post(dataAsBinaryString);
            try {
                streamParser(dataAsBinaryString);
            }
            catch (error) {
                debug("Stream parser error");
                _this.connection.emit("error", error);
            }
        });
        connection.once(this.encrypted ? "secureConnect" : "connect", function () {
            _this.fixPortAndAddr();
            _this.evtConnect.post();
        });
    }
    Socket.prototype.fixPortAndAddr = function () {
        this.__localPort__ = this.connection.localPort;
        this.__remotePort__ = this.connection.remotePort;
        this.__localAddress__ = this.connection.localAddress;
        this.__remoteAddress__ = this.connection.remoteAddress;
    };
    Socket.prototype.write = function (sipPacket) {
        if (this.evtClose.postCount)
            return false;
        if (matchRequest(sipPacket) && parseInt(sipPacket.headers["max-forwards"]) < 0)
            return false;
        if (!sipPacket.headers.via.length) {
            debug("Prevent sending packet without via header");
            return false;
        }
        return this.connection.write(new Buffer(exports.stringify(sipPacket), "binary"));
    };
    Socket.prototype.destroy = function () {
        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */
        //TODO: test, on destroy syncronously post close.
        this.connection.emit("close", false);
    };
    Object.defineProperty(Socket.prototype, "localPort", {
        get: function () {
            var localPort = this.__localPort__ || this.connection.localPort;
            if (typeof localPort !== "number" || isNaN(localPort))
                throw new Error("LocalPort not yet set");
            return localPort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "localAddress", {
        get: function () {
            var localAddress = this.__localAddress__ || this.connection.localAddress;
            if (!localAddress)
                throw new Error("LocalAddress not yet set");
            return localAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remotePort", {
        get: function () {
            var remotePort = this.__remotePort__ || this.connection.remotePort;
            if (typeof remotePort !== "number" || isNaN(remotePort))
                throw new Error("Remote port not yet set");
            return remotePort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remoteAddress", {
        get: function () {
            var remoteAddress = this.__remoteAddress__ || this.connection.remoteAddress;
            if (!remoteAddress)
                throw new Error("Remote address not yes set");
            return remoteAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "encrypted", {
        get: function () {
            return this.connection["encrypted"] ? true : false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "protocol", {
        get: function () {
            return this.encrypted ? "TLS" : "TCP";
        },
        enumerable: true,
        configurable: true
    });
    Socket.prototype.addViaHeader = function (sipRequest, extraParams) {
        if (extraParams === void 0) { extraParams = {}; }
        var branch = (function () {
            var via = sipRequest.headers.via;
            if (!via.length)
                return exports.generateBranch();
            sipRequest.headers["max-forwards"] = "" + (parseInt(sipRequest.headers["max-forwards"]) - 1);
            var previousBranch = via[0].params["branch"];
            //return `z9hG4bK-${md5(previousBranch)}`;
            return "z9hG4bK-" + previousBranch;
        })();
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": this.protocol,
            "host": this.localAddress,
            "port": this.localPort,
            "params": __assign({}, extraParams, { branch: branch, "rport": null })
        });
        return branch;
    };
    Socket.prototype.addPathHeader = function (sipRegisterRequest, host, extraParams) {
        if (!sipRegisterRequest.headers.path)
            sipRegisterRequest.headers.path = [];
        sipRegisterRequest.headers.path.unshift(this.buildRoute(host, extraParams));
    };
    /**
     *
     * Return stringified:
     * <sip:${host||this.localAddress}:this.localPort;transport=this.protocol;lr>
     *
     */
    Socket.prototype.buildRoute = function (host, extraParams) {
        if (host === void 0) { host = this.localAddress; }
        if (extraParams === void 0) { extraParams = {}; }
        return {
            "uri": __assign({}, exports.parseUri("sip:" + host + ":" + this.localPort), { "params": __assign({}, extraParams, { "transport": this.protocol, "lr": null }) }),
            "params": {}
        };
    };
    /**
     *
     * Assert sipRequest is NOT register.
     *
     * HOP_X ] => [ LOCAL_X, LOCAL_this ] => [ HOP_Y
     *
     * Before:
     * Route: LOCAL_X, HOP_Y
     * Record-Route: HOP_X
     *
     * After:
     * Route: HOP_Y
     * Record-Route: LOCAL_this, HOP_X
     *
     */
    Socket.prototype.shiftRouteAndUnshiftRecordRoute = function (sipRequest, host) {
        if (sipRequest.headers.route)
            sipRequest.headers.route.shift();
        if (!sipRequest.headers.contact)
            return;
        if (!sipRequest.headers["record-route"])
            sipRequest.headers["record-route"] = [];
        sipRequest.headers["record-route"].unshift(this.buildRoute(host));
    };
    /**
     *
     * HOP_X <= [ LOCAL_this, LOCAL_Y ] <= HOP_Y
     *
     * Before:
     * Record-Route: HOP_X, LOCAL_Y, HOP_Y
     *
     * After:
     * Record-Route: HOP_X, LOCAL_this, HOP_Y
     *
     * NOTE: We use a different implementation but end to end result is same.
     * In consequence isFirst hop must be set to true if and only if this is
     * this first hop of the response.
     *
     */
    Socket.prototype.pushRecordRoute = function (sipResponse, isFirstHop, host) {
        if (!sipResponse.headers["record-route"])
            return;
        if (isFirstHop)
            sipResponse.headers["record-route"] = [];
        sipResponse.headers["record-route"].push(this.buildRoute(host));
    };
    Socket.maxBytesHeaders = 7820;
    Socket.maxContentLength = 24624;
    return Socket;
}());
exports.Socket = Socket;
exports.stringify = sip.stringify;
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parse = sip.parse;
function parsePath(path) {
    var message = sip.parse([
        "DUMMY _ SIP/2.0",
        "Path: " + path,
        "\r\n"
    ].join("\r\n"));
    return message.headers.path;
}
exports.parsePath = parsePath;
function parseOptionTags(headerFieldValue) {
    if (!headerFieldValue)
        return [];
    return headerFieldValue.split(",").map(function (optionTag) { return optionTag.replace(/\s/g, ""); });
}
exports.parseOptionTags = parseOptionTags;
function hasOptionTag(headers, headerField, optionTag) {
    var headerFieldValue = headers[headerField];
    var optionTags = parseOptionTags(headerFieldValue);
    return optionTags.indexOf(optionTag) >= 0;
}
exports.hasOptionTag = hasOptionTag;
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag))
        return;
    var optionTags = parseOptionTags(headers[headerField]);
    optionTags.push(optionTag);
    headers[headerField] = optionTags.join(", ");
}
exports.addOptionTag = addOptionTag;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
