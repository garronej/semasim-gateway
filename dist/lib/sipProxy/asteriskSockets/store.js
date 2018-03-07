"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contactRegistrationMonitor = require("./contactsRegistrationMonitor");
/** map connectionId+imsi => asteriskSocket
 * PROTECTED: only for contactsRegistrationMonitor.ts
 */
exports.map = new Map();
var Key;
(function (Key) {
    function getId(key) {
        return `${key.connectionId};${key.imsi}`;
    }
    Key.getId = getId;
})(Key = exports.Key || (exports.Key = {}));
function set(key, asteriskSocket) {
    let id = Key.getId(key);
    exports.map.set(id, asteriskSocket);
    asteriskSocket.evtClose.attachOncePrepend(() => {
        exports.map.set(id, null);
        setTimeout(() => exports.map.delete(id), 60000).unref();
    });
    contactRegistrationMonitor.onNewAsteriskSocket(asteriskSocket, key);
}
exports.set = set;
/** null represent an expired connection */
function get(key) {
    return exports.map.get(Key.getId(key));
}
exports.get = get;
function flush() {
    for (let asteriskSocket of exports.map.values()) {
        if (asteriskSocket === null) {
            continue;
        }
        asteriskSocket.destroy();
    }
}
exports.flush = flush;
