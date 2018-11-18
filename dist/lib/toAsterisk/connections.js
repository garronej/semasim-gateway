"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var net = require("net");
var backendConnection = require("../toBackend/connection");
var i = require("../../bin/installer");
var logger = require("logger");
var sipContactsMonitor = require("../sipContactsMonitor");
var sipMessagesMonitor = require("../sipMessagesMonitor");
var router = require("./router");
/** Assert we have an active backend connection */
function connect(connectionId, imsi) {
    var backendSocket = backendConnection.get();
    /*
    Altho we connect to lo we must ensure that we do not
    use the loopback interface by providing the ip address
    of the interface used to connect to the internet.
    ( Otherwise problems with asterisk )

    We use a arbitrary port in the range of the unused
    in place of 5060 to not interfere with a potential
    other sip service running on the host.
     */
    var socket = new sip.Socket(net.connect({
        "host": backendSocket.localAddress,
        "port": i.ast_sip_port
    }), true);
    backendSocket.evtClose.attachOnce(function () { return socket.destroy("Backend socket closed => asterisk socket destroyed"); });
    socket.enableLogger({
        "socketId": "gatewayToAsterisk",
        "remoteEndId": "ASTERISK",
        "localEndId": "GATEWAY",
        "connection": false,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": true
    }, logger.log);
    var prContact = sipContactsMonitor.handleAsteriskSocket(socket);
    sipMessagesMonitor.handleAsteriskSocket(socket, prContact);
    {
        var connectionIdImsi_1 = "" + connectionId + imsi;
        byConnectionIdImsi.set(connectionIdImsi_1, socket);
        //TODO: See if really need prepend
        socket.evtClose.attachOncePrepend(function () {
            expiredRegistrations.add(connectionIdImsi_1);
            /*
            We do not keep the null ref for more than one
            minute to avoid a memory leak.
            */
            setTimeout(function () { return expiredRegistrations.delete(connectionIdImsi_1); }, 60000).unref();
            byConnectionIdImsi.delete(connectionIdImsi_1);
        });
    }
    router.handle(socket, connectionId, prContact.then(function (_a) {
        var uaSim = _a.uaSim;
        return uaSim.ua.platform;
    }));
    return socket;
}
exports.connect = connect;
var byConnectionIdImsi = new Map();
/**
 * We keep track of the connections that have
 * been recently closed so if we have some
 * more packet that comme for UA (connectionId)
 * to IMSI we can discard them and wait
 * for the UA to re-register with a new connection.
 */
var expiredRegistrations = new Set();
function get(connectionId, imsi) {
    return byConnectionIdImsi.get("" + connectionId + imsi);
}
exports.get = get;
function isExpiredRegistration(connectionId, imsi) {
    return expiredRegistrations.has("" + connectionId + imsi);
}
exports.isExpiredRegistration = isExpiredRegistration;
