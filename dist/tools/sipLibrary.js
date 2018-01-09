"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
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
function filterSdpCandidates(keep, sdp) {
    var shouldKeepCandidate = function (candidateLine) {
        return ((keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/)));
    };
    var parsedSdp = exports.parseSdp(sdp);
    var arr = parsedSdp.m[0].a;
    try {
        for (var _a = __values(__spread(arr)), _b = _a.next(); !_b.done; _b = _a.next()) {
            var line = _b.value;
            if (!line.match(/^candidate/))
                continue;
            if (!shouldKeepCandidate(line)) {
                arr.splice(arr.indexOf(line), 1);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return exports.stringifySdp(sdp);
    var e_1, _c;
}
exports.filterSdpCandidates = filterSdpCandidates;
function readSrflxAddrInSdp(sdp) {
    try {
        for (var _a = __values(exports.parseSdp(sdp).m), _b = _a.next(); !_b.done; _b = _a.next()) {
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return undefined;
    var e_3, _f, e_2, _e;
}
exports.readSrflxAddrInSdp = readSrflxAddrInSdp;
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
        this.misc = {};
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
    /** Return true if sent successfully */
    Socket.prototype.write = function (sipPacket) {
        var _this = this;
        if (this.evtClose.postCount) {
            debug("The socket you try to write on is closed");
            return false;
        }
        if (matchRequest(sipPacket)) {
            var maxForwards = parseInt(sipPacket.headers["max-forwards"]);
            if (isNaN(maxForwards)) {
                throw new Error("Write error, max-forwards header should be defined");
            }
            if (maxForwards === 0) {
                debug("Avoid writing, max forward reached");
                return false;
            }
            sipPacket.headers["max-forwards"] = "" + (maxForwards - 1);
        }
        if (!sipPacket.headers.via.length) {
            debug("Prevent sending packet without via header");
            return false;
        }
        var flushed = this.connection.write(new Buffer(exports.stringify(sipPacket), "binary"));
        if (flushed) {
            return true;
        }
        else {
            debug("we have to wait for drain to confirm write...");
            var boundTo_1 = [];
            return Promise.race([
                new Promise(function (resolve) { return _this.evtClose.attachOnce(boundTo_1, function () { return resolve(false); }); }),
                new Promise(function (resolve) { return _this.connection.once("drain", function () {
                    debug("...drain");
                    _this.evtClose.detach(boundTo_1);
                    resolve(true);
                }); })
            ]);
        }
    };
    Socket.prototype.destroy = function () {
        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */
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
            return via.length ? "z9hG4bK-" + via[0].params["branch"] : exports.generateBranch();
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
        if (!sipRegisterRequest.headers.path) {
            sipRegisterRequest.headers.path = [];
        }
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
