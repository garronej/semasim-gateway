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
process.once("unhandledRejection", error => { throw error; });
const dbAsterisk_1 = require("./dbAsterisk");
const dbSemasim_1 = require("./dbSemasim");
(() => __awaiter(this, void 0, void 0, function* () {
    yield dbAsterisk_1.testDbAsterisk();
    yield dbSemasim_1.testDbSemasim();
    console.log("ALL TESTS PASSED !");
    process.exit(0);
}))();
