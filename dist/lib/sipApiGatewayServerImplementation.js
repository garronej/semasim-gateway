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
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const sipApi_1 = require("../sipApi");
const sipApiBackend = require("./sipApiBackedClientImplementation");
const handlers = {};
const server = new sipApi_1.protocol.Server(handlers);
function startListening(backendSocket) {
    server.startListening(backendSocket);
}
exports.startListening = startListening;
(() => {
    const methodName = sipApi_1.gatewayDeclaration.getDongles.methodName;
    handlers[methodName] = (params, fromSocket) => __awaiter(this, void 0, void 0, function* () { return Array.from(chan_dongle_extended_client_1.DongleController.getInstance().dongles.values()); });
})();
(() => {
    const methodName = sipApi_1.gatewayDeclaration.unlockDongle.methodName;
    handlers[methodName] = (params, fromSocket) => __awaiter(this, void 0, void 0, function* () {
        let { imei, pin } = params;
        let response;
        try {
            response = yield chan_dongle_extended_client_1.DongleController.getInstance().unlock(imei, pin);
        }
        catch (_a) {
            response = undefined;
        }
        return response;
    });
})();
(() => {
    const methodName = sipApi_1.gatewayDeclaration.reNotifySimOnline.methodName;
    handlers[methodName] = (params, fromSocket) => __awaiter(this, void 0, void 0, function* () {
        let { imsi } = params;
        let dc = chan_dongle_extended_client_1.DongleController.getInstance();
        let dongle = Array.from(dc.activeDongles.values())
            .find(({ sim }) => sim.imsi === imsi);
        if (dongle) {
            sipApiBackend.notifySimOnline(dongle);
        }
        return undefined;
    });
})();
