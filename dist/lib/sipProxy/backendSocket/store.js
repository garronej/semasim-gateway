"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sipLibrary = require("../../../tools/sipLibrary");
const ts_events_extended_1 = require("ts-events-extended");
const localApiHandlers_1 = require("./localApiHandlers");
let currentBackendSocketInst = undefined;
exports.evtNewSocketInstance = new ts_events_extended_1.VoidSyncEvent();
const server = new sipLibrary.api.Server(localApiHandlers_1.handlers);
function set(backendSocketInst) {
    server.startListening(backendSocketInst);
    sipLibrary.api.client.enableKeepAlive(backendSocketInst);
    backendSocketInst.evtConnect.attachOnce(() => exports.evtNewSocketInstance.post());
    currentBackendSocketInst = backendSocketInst;
}
exports.set = set;
function get() {
    if (!currentBackendSocketInst ||
        currentBackendSocketInst.evtClose.postCount ||
        !currentBackendSocketInst.evtConnect.postCount) {
        return new Promise(resolve => exports.evtNewSocketInstance.attachOnce(() => resolve(currentBackendSocketInst)));
    }
    else {
        return currentBackendSocketInst;
    }
}
exports.get = get;
