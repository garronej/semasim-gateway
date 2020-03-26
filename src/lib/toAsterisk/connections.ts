
import * as sip from "ts-sip";
import * as net from "net";
import * as backendConnection from "../toBackend/connection";
import * as i from "../../bin/installer";
import { logger } from "../../tools/logger";
import * as sipContactsMonitor from "../sipContactsMonitor";
import * as sipMessagesMonitor from "../sipMessagesMonitor";
import * as router from "./router";

/** Assert we have an active backend connection */
export function connect(connectionId: string, imsi: string): sip.Socket {

    const backendSocket = backendConnection.get() as sip.Socket;

    /*
    Altho we connect to lo we must ensure that we do not 
    use the loopback interface by providing the ip address
    of the interface used to connect to the internet.
    ( Otherwise problems with asterisk )

    We use a arbitrary port in the range of the unused 
    in place of 5060 to not interfere with a potential
    other sip service running on the host.
     */
    const socket = new sip.Socket(
        net.connect({
            "host": backendSocket.localAddress,
            "port": i.ast_sip_port
        }),
        true
    );

    backendSocket.evtClose.attachOnce(
        () => socket.destroy("Backend socket closed => asterisk socket destroyed")
    );

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
    }, logger.log);

    const prContact = sipContactsMonitor.handleAsteriskSocket(socket);

    sipMessagesMonitor.handleAsteriskSocket(socket, prContact);

    {

        const key = { imsi, connectionId };

        connections.set(key, socket);

        //TODO: See if really need prepend
        socket.evtClose.attachOncePrepend(() => connections.remove(key));

    }

    router.handle(
        socket,
        connectionId,
        prContact.then(({ uaSim }) => uaSim.ua.platform)
    );

    return socket;

}


namespace connections {

    const map = new Map<string, sip.Socket>();

    type Key = { imsi: string, connectionId: string };

    export namespace Key {
        export const stringify = (key: Key) => `${key.connectionId}-${key.imsi}`;
    }

    export function set(key: Key, socket: sip.Socket): void {
        map.set(Key.stringify(key), socket);
    }

    export function get(key: Key): sip.Socket | undefined {
        return map.get(Key.stringify(key));
    }

    export function remove(key: Key): void {
        map.delete(Key.stringify(key));
    }

}

export const get = connections.get;






