"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_events_extended_1 = require("ts-events-extended");
const core = require("./core");
const misc = require("./misc");
const _debug = require("debug");
let debug = _debug("_tools/sipLibrary/Socket");
//TODO: make a function to test if message are well formed: have from, to via ect.
class Socket {
    constructor(connection, spoofedAddressAndPort = {}) {
        this.connection = connection;
        this.spoofedAddressAndPort = spoofedAddressAndPort;
        /** To store data contextually link to this socket */
        this.misc = {};
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtTimeout = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.__localPort__ = NaN;
        this.__remotePort__ = NaN;
        this.__localAddress__ = "";
        this.__remoteAddress__ = "";
        this.setKeepAlive = (...inputs) => Socket.matchWebSocket(this.connection) ?
            undefined :
            this.connection.setKeepAlive.apply(this.connection, inputs);
        let streamParser = misc.makeBufferStreamParser(sipPacket => misc.matchRequest(sipPacket) ?
            this.evtRequest.post(sipPacket) :
            this.evtResponse.post(sipPacket), () => this.connection.emit("error", new Error("Flood")), Socket.maxBytesHeaders, Socket.maxContentLength);
        this.connection
            .once("error", () => this.connection.emit("close", true))
            .once("close", had_error => {
            if (Socket.matchWebSocket(this.connection)) {
                this.connection.terminate();
            }
            else {
                this.connection.destroy();
            }
            this.evtClose.post(had_error === true);
        })
            .on(Socket.matchWebSocket(this.connection) ? "message" : "data", (data) => {
            if (typeof data === "string") {
                data = Buffer.from(data, "utf8");
            }
            this.evtData.post(data);
            try {
                streamParser(data);
            }
            catch (error) {
                debug("Stream parser error");
                this.connection.emit("error", error);
            }
        });
        if (Socket.matchWebSocket(this.connection)) {
            this.evtConnect.post(); //For post count
        }
        else {
            this.connection.setMaxListeners(Infinity);
            let setAddrAndPort = ((c) => (() => {
                this.__localPort__ = c.localPort;
                this.__remotePort__ = c.remotePort;
                this.__localAddress__ = c.remoteAddress;
                this.__remoteAddress__ = c.remoteAddress;
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
    get localPort() {
        return this.spoofedAddressAndPort.localPort || this.__localPort__;
    }
    get remotePort() {
        return this.spoofedAddressAndPort.remotePort || this.__remotePort__;
    }
    get localAddress() {
        return this.spoofedAddressAndPort.localAddress || this.__localAddress__;
    }
    get remoteAddress() {
        return this.spoofedAddressAndPort.remoteAddress || this.__remoteAddress__;
    }
    /** Return true if sent successfully */
    write(sipPacket) {
        if (!this.evtConnect.postCount) {
            throw new Error("Trying to write before socket connect");
        }
        if (this.evtClose.postCount) {
            debug("The socket you try to write on is closed");
            return new Promise(resolve => { });
        }
        if (misc.matchRequest(sipPacket)) {
            let maxForwards = parseInt(sipPacket.headers["max-forwards"]);
            if (maxForwards < 0) {
                debug("Avoid writing, max forward reached");
                return false;
            }
        }
        //TODO: why do we bother to check?
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
    buildNextHopPacket(sipPacket) {
        return misc.buildNextHopPacket(this, sipPacket);
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
