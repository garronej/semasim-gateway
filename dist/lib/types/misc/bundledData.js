"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ttJC = require("transfer-tools/dist/lib/JSON_CUSTOM");
const stringTransform = require("transfer-tools/dist/lib/stringTransform");
const JSON_CUSTOM = ttJC.get();
exports.urlSafeB64 = stringTransform.transcode("base64", { "=": "_" });
const header = (i) => `Bundled-Data-${i}`;
function smuggleBundledDataInHeaders(data, headers = {}) {
    let split = stringTransform.textSplit(125, exports.urlSafeB64.enc(JSON_CUSTOM.stringify(data)));
    for (let i = 0; i < split.length; i++) {
        headers[header(i)] = split[i];
    }
    return headers;
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
/** assert there is data */
function extractBundledDataFromHeaders(headers) {
    let split = [];
    let i = 0;
    while (true) {
        let key = header(i++);
        let part = headers[key] || headers[key.toLowerCase()];
        if (part) {
            split.push(part);
        }
        else {
            break;
        }
    }
    if (!split.length) {
        throw new Error("No bundled data in header");
    }
    return JSON_CUSTOM.parse(exports.urlSafeB64.dec(split.join("")));
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;
