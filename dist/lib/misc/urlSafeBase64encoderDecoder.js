"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
exports.urlSafeB64 = stringTransform.transcode("base64", {
    "=": "_",
    "/": "-"
});
