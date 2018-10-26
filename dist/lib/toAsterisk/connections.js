"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const net = require("net");
const backendConnection = require("../toBackend/connection");
const i = require("../../bin/installer");
const logger = require("logger");
const sipContactsMonitor = require("../sipContactsMonitor");
const sipMessagesMonitor = require("../sipMessagesMonitor");
const router = require("./router");
/** Assert we have an active backend connection */
function connect(connectionId, imsi) {
    const backendSocket = backendConnection.get();
    /*
    Altho we connect to lo we must ensure that we do not
    use the loopback interface by providing the ip address
    of the interface used to connect to the internet.
    ( Otherwise problems with asterisk )

    We use a arbitrary port in the range of the unused
    in place of 5060 to not interfere with a potential
    other sip service running on the host.
     */
    const socket = new sip.Socket(net.connect({
        "host": backendSocket.localAddress,
        "port": i.ast_sip_port
    }), true);
    backendSocket.evtClose.attachOnce(() => socket.destroy("Backend socket closed => asterisk socket destroyed"));
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
    const prContact = sipContactsMonitor.handleAsteriskSocket(socket);
    sipMessagesMonitor.handleAsteriskSocket(socket, prContact);
    {
        const connectionIdImsi = `${connectionId}${imsi}`;
        byConnectionIdImsi.set(connectionIdImsi, socket);
        //TODO: See if really need prepend
        socket.evtClose.attachOncePrepend(() => {
            expiredRegistrations.add(connectionIdImsi);
            /*
            We do not keep the null ref for more than one
            minute to avoid a memory leak.
            */
            setTimeout(() => expiredRegistrations.delete(connectionIdImsi), 60000).unref();
            byConnectionIdImsi.delete(connectionIdImsi);
        });
    }
    router.handle(socket, connectionId, prContact.then(({ uaSim }) => uaSim.ua.platform));
    return socket;
}
exports.connect = connect;
const byConnectionIdImsi = new Map();
/**
 * We keep track of the connections that have
 * been recently closed so if we have some
 * more packet that comme for UA (connectionId)
 * to IMSI we can discard them and wait
 * for the UA to re-register with a new connection.
 */
const expiredRegistrations = new Set();
function get(connectionId, imsi) {
    return byConnectionIdImsi.get(`${connectionId}${imsi}`);
}
exports.get = get;
function isExpiredRegistration(connectionId, imsi) {
    return expiredRegistrations.has(`${connectionId}${imsi}`);
}
exports.isExpiredRegistration = isExpiredRegistration;
