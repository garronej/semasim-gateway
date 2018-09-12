
import * as sip from "ts-sip";
import * as net from "net";
import * as backendConnection from "../toBackend/connection";
import * as i from "../../bin/installer";
import * as logger from "logger";
import * as sipContactsMonitor from "../sipContactsMonitor";
import * as sipMessagesMonitor from "../sipMessagesMonitor";
import * as router from "./router";

/** Assert we have an active backend connection */
export function connect( connectionId: string, imsi: string): sip.Socket{

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
        "connection": false,
        "error": true,
        "close": true,
        "incomingTraffic": true,
        "outgoingTraffic": true,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    }, logger.log);

    const prContact = sipContactsMonitor.handleAsteriskSocket(socket);

    sipMessagesMonitor.handleAsteriskSocket(socket, prContact);

    {

        const connectionIdImsi= `${connectionId}${imsi}`;

        byConnectionIdImsi.set(connectionIdImsi, socket);
        
        //TODO: See if really need prepend
        socket.evtClose.attachOncePrepend(()=> {

            expiredRegistrations.add(connectionIdImsi);

            /*
            We do not keep the null ref for more than one 
            minute to avoid a memory leak.
            */
            setTimeout(
                () => expiredRegistrations.delete(connectionIdImsi), 
                60000
            ).unref();
            
            byConnectionIdImsi.delete(connectionIdImsi);





        });

    }

    router.handle(socket, connectionId);

    return socket;

}

const byConnectionIdImsi = new Map<string, sip.Socket>();

/**
 * We keep track of the connections that have 
 * been recently closed so if we have some 
 * more packet that comme for UA (connectionId)
 * to IMSI we can discard them and wait 
 * for the UA to re-register with a new connection.
 */
const expiredRegistrations= new Set<string>();

export function get( 
    connectionId: string, 
    imsi: string 
): sip.Socket | undefined {
    return byConnectionIdImsi.get(`${connectionId}${imsi}`);
}

export function isExpiredRegistration(connectionId: string, imsi: string){
    return expiredRegistrations.has(`${connectionId}${imsi}`);
}
