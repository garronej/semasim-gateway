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
const dns = require("dns");
const network = require("network");
function resolveSrv(hostname) {
    return new Promise((resolve, reject) => dns.resolveSrv(hostname, (error, addresses) => (error || !addresses.length) ? reject(error || new Error("no record")) : resolve(addresses)));
}
exports.resolveSrv = resolveSrv;
function getActiveInterfaceIp() {
    return __awaiter(this, void 0, void 0, function* () {
        getActiveInterfaceIp.previousResult = yield new Promise((resolve, reject) => network.get_active_interface((error, obj) => error ? reject(error) : resolve(obj.ip_address)));
        return getActiveInterfaceIp.previousResult;
    });
}
exports.getActiveInterfaceIp = getActiveInterfaceIp;
(function (getActiveInterfaceIp) {
    getActiveInterfaceIp.previousResult = undefined;
})(getActiveInterfaceIp = exports.getActiveInterfaceIp || (exports.getActiveInterfaceIp = {}));
