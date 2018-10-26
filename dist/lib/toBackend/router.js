"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const misc = require("../misc");
const asteriskConnections = require("../toAsterisk/connections");
const logger = require("logger");
const debug = logger.debugFactory();
function handle(socket) {
    socket.evtRequest.attach((sipRequest) => __awaiter(this, void 0, void 0, function* () {
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
            yield asteriskSocket.evtConnect.waitFor();
        }
        asteriskSocket.write(asteriskSocket.buildNextHopPacket(sipRequest));
    }));
    socket.evtResponse.attach(sipResponse => {
        const connectionId = misc.cid.read(sipResponse);
        const imsi = misc.readImsi(sipResponse);
        const asteriskSocket = asteriskConnections.get(connectionId, imsi);
        if (!asteriskSocket) {
            return;
        }
        asteriskSocket.write(asteriskSocket.buildNextHopPacket(sipResponse));
    });
}
exports.handle = handle;
