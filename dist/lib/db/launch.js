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
const asterisk_1 = require("./asterisk");
const semasim_1 = require("./semasim");
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([
            asterisk_1.launch(),
            semasim_1.launch()
        ]);
    });
}
exports.launch = launch;
