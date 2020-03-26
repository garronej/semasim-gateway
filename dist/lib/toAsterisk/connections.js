"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var net = require("net");
var backendConnection = require("../toBackend/connection");
var i = require("../../bin/installer");
var logger_1 = require("../../tools/logger");
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
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": true
    }, logger_1.logger.log);
    var prContact = sipContactsMonitor.handleAsteriskSocket(socket);
    sipMessagesMonitor.handleAsteriskSocket(socket, prContact);
    {
        var key_1 = { imsi: imsi, connectionId: connectionId };
        connections.set(key_1, socket);
        //TODO: See if really need prepend
        socket.evtClose.attachOncePrepend(function () { return connections.remove(key_1); });
    }
    router.handle(socket, connectionId, prContact.then(function (_a) {
        var uaSim = _a.uaSim;
        return uaSim.ua.platform;
    }));
    return socket;
}
exports.connect = connect;
var connections;
(function (connections) {
    var map = new Map();
    var Key;
    (function (Key) {
        Key.stringify = function (key) { return key.connectionId + "-" + key.imsi; };
    })(Key = connections.Key || (connections.Key = {}));
    function set(key, socket) {
        map.set(Key.stringify(key), socket);
    }
    connections.set = set;
    function get(key) {
        return map.get(Key.stringify(key));
    }
    connections.get = get;
    function remove(key) {
        map.delete(Key.stringify(key));
    }
    connections.remove = remove;
})(connections || (connections = {}));
exports.get = connections.get;
