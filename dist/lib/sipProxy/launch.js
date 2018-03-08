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
const messages = require("./messages/index_sipProxy");
const router = require("./router");
let launchCount = 0;
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log({ launchCount });
        if (!launchCount) {
            yield messages.initDialplan();
        }
        let backendSocketInst = yield router.createBackendSocket();
        backendSocketInst.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
            console.log("Backend socket closed, waiting and restarting");
            let delay = (function getRandomArbitrary(min, max) {
                return Math.floor(Math.random() * (max - min) + min);
            })(3000, 5000);
            yield new Promise(resolve => setTimeout(resolve, delay));
            launch();
        }));
        launchCount++;
    });
}
exports.launch = launch;
