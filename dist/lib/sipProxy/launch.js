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
const messages = require("./messages");
const router = require("./router");
const versionStatus_1 = require("../versionStatus");
const logger = require("../../tools/logger");
const debug = logger.debugFactory();
let isFistLaunch = true;
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isFistLaunch) {
            isFistLaunch = false;
            yield messages.init();
        }
        let backendSocketInst = yield router.createBackendSocket();
        backendSocketInst.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
            debug("Backend socket closed, waiting and restarting");
            yield new Promise(resolve => setTimeout(resolve, versionStatus_1.genRetryDelay()));
            if ("UP TO DATE" !== (yield versionStatus_1.getVersionStatus())) {
                debug("Need update, restarting ...");
                process.exit(1);
            }
            launch();
        }));
    });
}
exports.launch = launch;
