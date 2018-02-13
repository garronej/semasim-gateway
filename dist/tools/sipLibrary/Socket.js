"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_events_extended_1 = require("ts-events-extended");
const core = require("./core");
const misc = require("./misc");
const _debug = require("debug");
let debug = _debug("_tools/sipLibrary/Socket");
//TODO: make a function to test if message are well formed: have from, to via ect.
class Socket {
    constructor(...inputs) {
        /** To store data contextually link to this socket */
        this.misc = {};
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtTimeout = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.localPort = NaN;
        this.remotePort = NaN;
        this.localAddress = "";
        this.remoteAddress = "";
        this.localAddressPublic = undefined;
        this.setKeepAlive = (...inputs) => Socket.matchWebSocket(this.connection) ?
            undefined :
            this.connection.setKeepAlive.apply(this.connection, inputs);
        this.connection = inputs[0];
        let timeoutDelay;
        let addrAndPorts;
        if (Socket.matchWebSocket(this.connection)) {
            addrAndPorts = inputs[1];
            timeoutDelay = inputs[2];
            debug({ addrAndPorts });
        }
        else {
            addrAndPorts = undefined;
            timeoutDelay = inputs[1];
        }
        let streamParser = core.makeStreamParser(sipPacket => misc.matchRequest(sipPacket) ?
            this.evtRequest.post(sipPacket) :
            this.evtResponse.post(sipPacket), () => this.connection.emit("error", new Error("Flood")), Socket.maxBytesHeaders, Socket.maxContentLength);
        this.connection
            .once("error", () => this.connection.emit("close", true))
            .once("close", had_error => {
            if (timeoutDelay)
                clearTimeout(this.timer);
            if (Socket.matchWebSocket(this.connection)) {
                this.connection.terminate();
            }
            else {
                this.connection.destroy();
            }
            this.evtClose.post(had_error === true);
        })
            .on(Socket.matchWebSocket(this.connection) ? "message" : "data", (data) => {
            if (timeoutDelay) {
                clearTimeout(this.timer);
                this.timer = setTimeout(() => this.evtTimeout.post(), timeoutDelay);
            }
            let dataAsBinaryString;
            if (typeof data === "string") {
                dataAsBinaryString = (new Buffer(data, "utf8")).toString("binary");
            }
            else {
                dataAsBinaryString = data.toString("binary");
            }
            this.evtData.post(dataAsBinaryString);
            try {
                streamParser(dataAsBinaryString);
            }
            catch (error) {
                debug("Stream parser error");
                this.connection.emit("error", error);
            }
        });
        if (Socket.matchWebSocket(this.connection)) {
            this.localPort = addrAndPorts.localPort;
            this.remotePort = addrAndPorts.remotePort;
            this.localAddress = addrAndPorts.localAddress;
            this.remoteAddress = addrAndPorts.remoteAddress;
            this.evtConnect.post(); //For post count
        }
        else {
            this.connection.setMaxListeners(Infinity);
            let setAddrAndPort = ((c) => (() => {
                this.localPort = c.localPort;
                this.remotePort = c.remotePort;
                this.localAddress = c.remoteAddress;
                this.remoteAddress = c.remoteAddress;
            }))(this.connection);
            setAddrAndPort();
            if (this.connection.localPort) {
                this.evtConnect.post(); //For post count
            }
            else {
                this.connection.once(this.connection["encrypted"] ? "secureConnect" : "connect", () => {
                    setAddrAndPort();
                    this.evtConnect.post();
                });
            }
        }
    }
    /** Return true if sent successfully */
    write(sipPacket) {
        if (this.evtClose.postCount) {
            debug("The socket you try to write on is closed");
            return false;
        }
        if (misc.matchRequest(sipPacket)) {
            let maxForwards = parseInt(sipPacket.headers["max-forwards"]);
            if (isNaN(maxForwards)) {
                throw new Error("Write error, max-forwards header should be defined");
            }
            if (maxForwards === 0) {
                debug("Avoid writing, max forward reached");
                return false;
            }
            sipPacket.headers["max-forwards"] = `${maxForwards - 1}`;
        }
        if (!sipPacket.headers.via.length) {
            debug("Prevent sending packet without via header");
            return false;
        }
        //TODO: this can potentially throw, make sure it's ok
        let data = Buffer.from(core.stringify(sipPacket), "binary");
        if (Socket.matchWebSocket(this.connection)) {
            return new Promise(resolve => this.connection
                .send(data, { "binary": true }, error => resolve(error ? true : false)));
        }
        else {
            let flushed = this.connection.write(data);
            if (flushed) {
                return true;
            }
            else {
                let boundTo = [];
                return Promise.race([
                    new Promise(resolve => this.evtClose.attachOnce(boundTo, () => resolve(false))),
                    new Promise(resolve => this.connection.once("drain", () => {
                        this.evtClose.detach(boundTo);
                        resolve(true);
                    }))
                ]);
            }
        }
    }
    destroy() {
        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */
        this.connection.emit("close", false);
    }
    get protocol() {
        if (Socket.matchWebSocket(this.connection)) {
            return "WSS";
        }
        else {
            return this.connection["encrypted"] ? "TLS" : "TCP";
        }
    }
    addViaHeader(sipRequest, extraParams = {}) {
        let branch = (() => {
            let via = sipRequest.headers.via;
            return via.length ? `z9hG4bK-${via[0].params["branch"]}` : core.generateBranch();
        })();
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": this.protocol,
            "host": this.localAddress,
            "port": this.localPort,
            "params": Object.assign({}, extraParams, { branch, "rport": null })
        });
        return branch;
    }
    addPathHeader(sipRegisterRequest, extraParams) {
        if (!sipRegisterRequest.headers.path) {
            sipRegisterRequest.headers.path = [];
        }
        sipRegisterRequest.headers.path.unshift(this.buildRoute(extraParams));
    }
    /**
     *
     * Return stringified:
     * <sip:${host||this.localAddress}:this.localPort;transport=this.protocol;lr>
     *
     */
    buildRoute(extraParams = {}) {
        let host = this.localAddressPublic || this.localAddress;
        return {
            "uri": Object.assign({}, core.parseUri(`sip:${host}:${this.localPort}`), { "params": Object.assign({}, extraParams, { "transport": this.protocol, "lr": null }) }),
            "params": {}
        };
    }
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
    shiftRouteAndUnshiftRecordRoute(sipRequest) {
        if (sipRequest.headers.route)
            sipRequest.headers.route.shift();
        if (!sipRequest.headers.contact)
            return;
        if (!sipRequest.headers["record-route"])
            sipRequest.headers["record-route"] = [];
        sipRequest.headers["record-route"].unshift(this.buildRoute());
    }
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
    pushRecordRoute(sipResponse, isFirstHop) {
        if (!sipResponse.headers["record-route"])
            return;
        if (isFirstHop)
            sipResponse.headers["record-route"] = [];
        sipResponse.headers["record-route"].push(this.buildRoute());
    }
}
Socket.maxBytesHeaders = 7820;
Socket.maxContentLength = 24624;
exports.Socket = Socket;
(function (Socket) {
    function matchWebSocket(socket) {
        return socket.terminate !== undefined;
    }
    Socket.matchWebSocket = matchWebSocket;
})(Socket = exports.Socket || (exports.Socket = {}));
