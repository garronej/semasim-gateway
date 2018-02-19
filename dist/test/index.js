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
require("rejection-tracker").main(__dirname, "..", "..");
const dbAsterisk_1 = require("./dbAsterisk");
const db_1 = require("./db");
(() => __awaiter(this, void 0, void 0, function* () {
    yield dbAsterisk_1.testDbAsterisk();
    yield db_1.testDbSemasim();
    console.log("ALL TESTS PASSED !");
    process.exit(0);
}))();