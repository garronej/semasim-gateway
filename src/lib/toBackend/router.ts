
import * as sip from "ts-sip";
import * as misc from "../misc";
import * as asteriskConnections from "../toAsterisk/connections";
import * as logger from "logger";

const debug= logger.debugFactory();

export function handle(socket: sip.Socket) {

    socket.evtRequest.attach(async sipRequest => {

        const connectionId = misc.cid.read(sipRequest);
        const imsi = misc.readImsi(sipRequest);


        let asteriskSocket = asteriskConnections.get(connectionId, imsi);

        if (!asteriskSocket) {

            if (asteriskConnections.isExpiredRegistration(connectionId, imsi)) {

                debug("connectionId expired, discarding".red);

                return;

            }

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

        const connectionId = misc.cid.read(sipResponse);
        const imsi = misc.readImsi(sipResponse);

        const asteriskSocket = asteriskConnections.get(connectionId, imsi);

        if (!asteriskSocket) {
            return;
        }

        asteriskSocket.write(
            asteriskSocket.buildNextHopPacket(sipResponse)
        );

    });

}

