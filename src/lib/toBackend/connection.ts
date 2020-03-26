
import * as sip from "ts-sip";
import { Evt } from "evt";
import * as localApiHandlers from "./localApiHandlers";
import { logger } from "../../tools/logger";
import * as tls from "tls";
import * as versionStatus from "../versionStatus";
import * as router from "./router";
import * as i from "../../bin/installer";

//TODO: Implement before exit to close the socket.

const debug = logger.debugFactory();

const idString = "gatewayToBackend";

const apiServer = new sip.api.Server(
    localApiHandlers.handlers,
    sip.api.Server.getDefaultLogger({
        idString,
        "log": logger.log,
        "hideKeepAlive": true
    })
);

let socketCurrent: sip.Socket | undefined = undefined;

//TODO: Because of the load balancer even if the Backend is down
//the connect event is posted. Maybe wait until we have a successful 
//ping response before posting this.
export const evtConnect = new Evt<sip.Socket>();

export async function connect() {


    //TODO: Bind to local ip ?
    //TODO: see if local address is automatically set, if so avoid getting Active interface
    //ip
    const socket = new sip.Socket(
        tls.connect({ 
            "host": `sip.${i.getBaseDomain()}` , 
            "port": 80 
        }),
        true
    );

    socket.evtClose.attachOnce(async ()=> {

        await new Promise( 
            resolve => setTimeout(resolve,versionStatus.genRetryDelay() )
        );

        if( i.getEnv() === "PROD" && (await versionStatus.getVersion()).status !== "UP TO DATE" ){

            debug("Need update, restarting ...");

            process.emit("beforeExit", process.exitCode = 0);

            return;

        }

        connect();

    });

    apiServer.startListening(socket);

    sip.api.client.enableKeepAlive(socket, 10 * 60 * 1000 );

    sip.api.client.enableErrorLogging(
        socket,
        sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );

    socket.enableLogger({
        "socketId": idString,
        "remoteEndId": "BACKEND",
        "localEndId": "GATEWAY",
        "connection": false,
        "error": true,
        "close": true,
        "incomingTraffic": true,
        "outgoingTraffic": true,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    }, logger.log);

    socketCurrent = socket;

    socket.evtConnect.attachOnce(()=> evtConnect.post(socket));

    router.handle(socket);

}

export function get(): sip.Socket | Promise<sip.Socket> {

    if (
        !socketCurrent ||
        socketCurrent.evtClose.postCount !== 0 ||
        socketCurrent.evtConnect.postCount === 0
    ) {

        return evtConnect.waitFor();

    } else {

        return socketCurrent;

    }

}
