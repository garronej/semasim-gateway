"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sipLibrary = require("../../../tools/sipLibrary");
const ts_events_extended_1 = require("ts-events-extended");
const localApiHandlers_1 = require("./localApiHandlers");
let currentBackendSocketInst = undefined;
exports.evtNewSocketInstance = new ts_events_extended_1.SyncEvent();
function get() {
    if (!currentBackendSocketInst ||
        currentBackendSocketInst.evtClose.postCount ||
        !currentBackendSocketInst.evtConnect.postCount) {
        return exports.evtNewSocketInstance.waitFor();
    }
    else {
        return currentBackendSocketInst;
    }
}
exports.get = get;
var _protected;
(function (_protected) {
    const server = new sipLibrary.api.Server(localApiHandlers_1.handlers);
    function set(backendSocketInst) {
        server.startListening(backendSocketInst);
        backendSocketInst.evtConnect.attachOnce(() => {
            new sipLibrary.api.Client(backendSocketInst);
            exports.evtNewSocketInstance.post(backendSocketInst);
        });
        currentBackendSocketInst = backendSocketInst;
    }
    _protected.set = set;
})(_protected = exports._protected || (exports._protected = {}));
