"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_events_extended_1 = require("ts-events-extended");
const core = require("./core");
const misc = require("./misc");
const ApiMessage_1 = require("./api/ApiMessage");
require("colors");
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
        /**Emit chunk of data as received by the underlying connection*/
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.evtDataOut = new ts_events_extended_1.SyncEvent();
        /** Provided only so the error can be logged */
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtPacketPreWrite = new ts_events_extended_1.SyncEvent();
        this.__localPort__ = NaN;
        this.__remotePort__ = NaN;
        this.__localAddress__ = "";
        this.__remoteAddress__ = "";
        this.haveBeedDestroyed = false;
        this.setKeepAlive = (...inputs) => Socket.matchWebSocket(this.connection) ?
            undefined :
            this.connection.setKeepAlive.apply(this.connection, inputs);
        this.loggerEvt = {};
        let streamParser = core.makeStreamParser(sipPacket => {
            if (!!this.loggerEvt.evtPacketIn) {
                this.loggerEvt.evtPacketIn.post(sipPacket);
            }
            if (misc.matchRequest(sipPacket)) {
                this.evtRequest.post(sipPacket);
            }
            else {
                this.evtResponse.post(sipPacket);
            }
        }, (data, floodType) => {
            let message = "Flood! ";
            switch (floodType) {
                case "headers":
                    message += `Sip Headers length > ${Socket.maxBytesHeaders} Bytes`;
                case "content":
                    message += `Sip content length > ${Socket.maxContentLength} Bytes`;
            }
            let error = new Error(message);
            error["flood_data"] = data;
            error["flood_data_toString"] = data.toString("utf8");
            this.connection.emit("error", error);
        }, Socket.maxBytesHeaders, Socket.maxContentLength);
        this.connection
            .once("error", obj => {
            this.evtError.post(Socket.matchWebSocket(this.connection) ? obj.error : obj);
            this.connection.emit("close", true);
        })
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
                this.connection.emit("error", error);
            }
        });
        if (Socket.matchWebSocket(this.connection)) {
            this.evtConnect.post(); //For post count
        }
        else {
            this.connection.setMaxListeners(Infinity);
            const setAddrAndPort = ((c) => (() => {
                this.__localPort__ = c.localPort;
                this.__remotePort__ = c.remotePort;
                this.__localAddress__ = c.localAddress;
                this.__remoteAddress__ = c.remoteAddress;
            }))(this.connection);
            setAddrAndPort();
            if (this.connection.localPort) {
                this.evtConnect.post(); //For post count
            }
            else {
                let timer = setTimeout(() => {
                    if (!!this.evtClose.postCount) {
                        return;
                    }
                    this.connection.emit("error", new Error(`Sip socket connection timeout after ${Socket.connectionTimeout}`));
                }, Socket.connectionTimeout);
                this.connection.once(this.connection["encrypted"] ? "secureConnect" : "connect", () => {
                    clearTimeout(timer);
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
            return new Promise(resolve => { });
        }
        if (misc.matchRequest(sipPacket)) {
            let maxForwardsHeaderValue = sipPacket.headers["max-forwards"];
            if (maxForwardsHeaderValue !== undefined) {
                let maxForwards = parseInt(maxForwardsHeaderValue);
                if (maxForwards < 0) {
                    return false;
                }
            }
        }
        this.evtPacketPreWrite.post(sipPacket);
        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        let data = core.toData(sipPacket);
        let out;
        if (Socket.matchWebSocket(this.connection)) {
            out = new Promise(resolve => this.connection
                .send(data, { "binary": true }, error => resolve(error ? true : false)));
        }
        else {
            let flushed = this.connection.write(data);
            if (flushed) {
                out = true;
            }
            else {
                let boundTo = [];
                out = Promise.race([
                    new Promise(resolve => this.evtClose.attachOnce(boundTo, () => resolve(false))),
                    new Promise(resolve => this.connection.once("drain", () => {
                        this.evtClose.detach(boundTo);
                        resolve(true);
                    }))
                ]);
            }
        }
        ((out instanceof Promise) ? out : Promise.resolve(true))
            .then(isSent => {
            if (isSent) {
                if (!!this.loggerEvt.evtPacketOut) {
                    this.loggerEvt.evtPacketOut.post(sipPacket);
                }
                this.evtDataOut.post(data);
            }
        });
        return out;
    }
    destroy() {
        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */
        this.haveBeedDestroyed = true;
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
    enableLogger(params, log = console.log) {
        const prefix = `[ Sip Socket ${this.protocol} ]`.yellow;
        const getKey = (params.colorizedTraffic === "IN") ? (direction => [
            prefix,
            params.remoteEndId,
            direction === "IN" ? "=>" : "<=",
            `${params.localEndId} ( ${params.socketId} )`,
            "\n"
        ].join(" ")) : (direction => [
            prefix,
            `${params.localEndId} ( ${params.socketId} )`,
            direction === "IN" ? "<=" : "=>",
            params.remoteEndId,
            "\n"
        ].join(" "));
        const getColor = (direction) => (params.colorizedTraffic === direction) ? "yellow" : "white";
        const matchPacket = (sipPacket) => params.ignoreApiTraffic ? !(misc.matchRequest(sipPacket) &&
            sipPacket.method === ApiMessage_1.sipMethodName) : true;
        const onPacket = (sipPacket, direction) => log(getKey(direction), misc.stringify(sipPacket)[getColor(direction)]);
        if (!!params.incomingTraffic) {
            this.loggerEvt.evtPacketIn = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketIn.attach(matchPacket, sipPacket => onPacket(sipPacket, "IN"));
        }
        if (!!params.outgoingTraffic) {
            this.loggerEvt.evtPacketOut = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketOut.attach(matchPacket, sipPacket => onPacket(sipPacket, "OUT"));
        }
        if (!!params.error) {
            this.evtError.attachOnce(error => log(`${prefix} ${params.socketId} Error`.red, error));
        }
        if (!!params.connection) {
            let message = `${prefix} ${params.socketId} connected`;
            if (!!this.evtConnect.postCount) {
                log(message);
            }
            else {
                this.evtConnect.attachOnce(() => log(message));
            }
        }
        if (!!params.close) {
            let getMessage = () => [
                `${prefix} ${params.socketId} closed`,
                this.haveBeedDestroyed ? "( locally destroyed )" : ""
            ].join(" ");
            if (!!this.evtClose.postCount) {
                log(getMessage());
            }
            else {
                this.evtClose.attachOnce(hasError => log(getMessage()));
            }
        }
    }
}
Socket.maxBytesHeaders = 7820;
Socket.maxContentLength = 24624;
Socket.connectionTimeout = 3000;
exports.Socket = Socket;
(function (Socket) {
    function matchWebSocket(socket) {
        return socket.terminate !== undefined;
    }
    Socket.matchWebSocket = matchWebSocket;
})(Socket = exports.Socket || (exports.Socket = {}));
