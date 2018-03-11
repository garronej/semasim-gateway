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
const apiDeclaration = require("./../../sipApiDeclarations/semasimGateway/backendSocket");
const remoteApi = require("./remoteApiCaller");
const db = require("../../db");
exports.handlers = {};
(() => {
    const methodName = apiDeclaration.getDongles.methodName;
    let handler = {
        "handler": () => Promise.resolve(Array.from(chan_dongle_extended_client_1.DongleController.getInstance().dongles.values()))
    };
    exports.handlers[methodName] = handler;
})();
(() => {
    const methodName = apiDeclaration.getUsableDongleHoldingSim.methodName;
    let handler = {
        "handler": ({ imsi }) => Promise.resolve(Array.from(chan_dongle_extended_client_1.DongleController.getInstance().usableDongles.values())
            .find(({ sim }) => sim.imsi === imsi))
    };
    exports.handlers[methodName] = handler;
})();
(() => {
    const methodName = apiDeclaration.whoHasLockedDongle.methodName;
    let handler = {
        "handler": ({ imei }) => __awaiter(this, void 0, void 0, function* () { return !!chan_dongle_extended_client_1.DongleController.getInstance().lockedDongles.get(imei) ? "I" : undefined; })
    };
    exports.handlers[methodName] = handler;
})();
(() => {
    const methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    let handler = {
        "handler": ({ imsi }) => __awaiter(this, void 0, void 0, function* () {
            let dc = chan_dongle_extended_client_1.DongleController.getInstance();
            let dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (!dongle) {
                return undefined;
            }
            let sipPassword = yield db.asterisk.createEndpointIfNeededAndGetPassword(imsi);
            return { dongle, sipPassword };
        })
    };
    exports.handlers[methodName] = handler;
})();
(() => {
    const methodName = apiDeclaration.unlockDongle.methodName;
    let handler = {
        "handler": ({ imei, pin }) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield chan_dongle_extended_client_1.DongleController.getInstance().unlock(imei, pin);
            }
            catch (_a) {
                return undefined;
            }
        })
    };
    exports.handlers[methodName] = handler;
})();
(() => {
    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    let handler = {
        "handler": ({ imsi }) => __awaiter(this, void 0, void 0, function* () {
            let dc = chan_dongle_extended_client_1.DongleController.getInstance();
            let dongle = Array.from(dc.usableDongles.values())
                .find(({ sim }) => sim.imsi === imsi);
            if (dongle) {
                remoteApi.notifySimOnline(dongle);
            }
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
})();
