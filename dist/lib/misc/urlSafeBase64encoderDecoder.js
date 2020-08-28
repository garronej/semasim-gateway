"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlSafeB64 = void 0;
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
exports.urlSafeB64 = stringTransform.transcode("base64", {
    "=": "_",
    "/": "-"
});
