"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerThreadPoolId = void 0;
var cryptoLib = require("crypto-lib");
exports.workerThreadPoolId = cryptoLib.workerThreadPool.Id.generate();
