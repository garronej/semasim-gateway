
import * as sip from "ts-sip";
import { SyncEvent } from "ts-events-extended";
import * as localApiHandlers from "./localApiHandlers";
import * as logger from "logger";
import * as tls from "tls";
import * as versionStatus from "../versionStatus";
import * as router from "./router";

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

export const evtConnect = new SyncEvent<sip.Socket>();

export async function connect() {


    //TODO: Bind to local ip ?
    //TODO: see if local address is automatically set, if so avoid getting Active interface
    //ip
    const socket = new sip.Socket(
        tls.connect({ 
            "host": "sip.semasim.com" , 
            "port": 80 
        }),
        true
    );

    socket.evtClose.attachOnce(async ()=> {

        await new Promise( 
            resolve => setTimeout(resolve,versionStatus.genRetryDelay() )
        );

        if( (await versionStatus.getVersionStatus()) !== "UP TO DATE" ){

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
        "incomingTraffic": false,
        "outgoingTraffic": false,
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
