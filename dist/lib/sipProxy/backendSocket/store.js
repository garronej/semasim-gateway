"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sipLibrary = require("ts-sip");
const ts_events_extended_1 = require("ts-events-extended");
const localApiHandlers_1 = require("./localApiHandlers");
let currentBackendSocketInst = undefined;
exports.evtNewBackendConnection = new ts_events_extended_1.VoidSyncEvent();
const idString = "backendSocket";
const server = new sipLibrary.api.Server(localApiHandlers_1.handlers, sipLibrary.api.Server.getDefaultLogger({
    idString,
    "hideKeepAlive": true
}));
function set(backendSocketInst) {
    server.startListening(backendSocketInst);
    sipLibrary.api.client.enableKeepAlive(backendSocketInst);
    sipLibrary.api.client.enableErrorLogging(backendSocketInst, sipLibrary.api.client.getDefaultErrorLogger({ idString }));
    backendSocketInst.evtConnect.attachOnce(() => exports.evtNewBackendConnection.post());
    currentBackendSocketInst = backendSocketInst;
}
exports.set = set;
function get() {
    if (!currentBackendSocketInst ||
        currentBackendSocketInst.evtClose.postCount ||
        !currentBackendSocketInst.evtConnect.postCount) {
        return new Promise(resolve => exports.evtNewBackendConnection.attachOnce(() => resolve(currentBackendSocketInst)));
    }
    else {
        return currentBackendSocketInst;
    }
}
exports.get = get;
