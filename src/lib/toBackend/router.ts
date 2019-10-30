
import * as sip from "ts-sip";
import * as sipRouting from "../misc/sipRouting";
import * as asteriskConnections from "../toAsterisk/connections";
//import * as logger from "logger";

//const debug= logger.debugFactory();

export function handle(socket: sip.Socket) {

    socket.evtRequest.attach(async sipRequest => {

        const connectionId = sipRouting.cid.read(sipRequest);
        const imsi = sipRouting.readImsi(sipRequest);


        let asteriskSocket = asteriskConnections.get({ connectionId, imsi });

        if (!asteriskSocket) {

            asteriskSocket = asteriskConnections.connect(connectionId, imsi);

        }

        if (asteriskSocket.evtConnect.postCount === 0) {
            await asteriskSocket.evtConnect.waitFor();
        }

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipRequest)
        );

    });

    socket.evtResponse.attach(sipResponse => {

        const connectionId = sipRouting.cid.read(sipResponse);
        const imsi = sipRouting.readImsi(sipResponse);

        const asteriskSocket = asteriskConnections.get({ connectionId, imsi });

        if (!asteriskSocket) {
            return;
        }

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipResponse)
        );

    });

}

