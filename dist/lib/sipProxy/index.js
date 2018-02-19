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
const messages_1 = require("./messages");
exports.evtMessage = messages_1.evtMessage;
exports.sendMessage = messages_1.sendMessage;
exports.sipMessageContext = messages_1.sipMessageContext;
const route_1 = require("./route");
exports.evtNewBackendSocketConnect = route_1.evtNewBackendSocketConnect;
exports.getBackendSocket = route_1.getBackendSocket;
const asteriskSockets = require("./asteriskSockets");
var evtContactRegistration = asteriskSockets.evtContactRegistration;
exports.evtContactRegistration = evtContactRegistration;
function getContacts(imsi) {
    return asteriskSockets.getContacts(imsi);
}
exports.getContacts = getContacts;
function flushRegistrations(imsi) {
    asteriskSockets.flush(imsi);
}
exports.flushRegistrations = flushRegistrations;
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        yield messages_1.startHandling();
        yield route_1.start();
    });
}
exports.start = start;
