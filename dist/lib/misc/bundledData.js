"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stringTransform = require("transfer-tools/dist/lib/stringTransform");
exports.urlSafeB64 = stringTransform.transcode("base64", { "=": "_" });
const header = (i) => `Bundled-Data-${i}`;
/**
 *
 * In order to ease the cross implementation in Java and Objective C
 * we use this function to serialize Date instead of JSON_CUSTOM.
 * We serialize by converting date into timestamp.
 *
 * We enforce that any date property must have as name a string
 * that end with Date or date otherwise an error will be thrown.
 *
 * Date are allowed to be null.
 *
 */
function replacer_reviver(isReplacer, key, value) {
    if (value === null) {
        return value;
    }
    const cKey = !!key.match(/[Dd]ate$/);
    const cVal = isReplacer ? (typeof value === "string" &&
        !!value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)) : typeof value === "number";
    if (isReplacer ? (cKey !== cVal) : (cKey && !cVal)) {
        throw new Error("Bundled data design error");
    }
    if (!cKey) {
        return value;
    }
    const date = new Date(value);
    return isReplacer ? date.getTime() : date;
}
;
function smuggleBundledDataInHeaders(data, headers = {}) {
    const split = stringTransform.textSplit(125, exports.urlSafeB64.enc(JSON.stringify(data, (key, value) => replacer_reviver(true, key, value))));
    for (let i = 0; i < split.length; i++) {
        headers[header(i)] = split[i];
    }
    return headers;
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
/** assert there is data */
function extractBundledDataFromHeaders(headers) {
    const split = [];
    let i = 0;
    while (true) {
        const key = header(i++);
        const part = headers[key] || headers[key.toLowerCase()];
        if (!!part) {
            split.push(part);
        }
        else {
            break;
        }
    }
    if (!split.length) {
        throw new Error("No bundled data in header");
    }
    return JSON.parse(exports.urlSafeB64.dec(split.join("")), (key, value) => replacer_reviver(false, key, value));
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;
