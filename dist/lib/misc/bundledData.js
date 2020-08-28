"use strict";
/* NOTE: Used in the browser. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBundledDataFromHeaders = exports.BundledDataSipHeaders = exports.smuggleBundledDataInHeaders = void 0;
var serializer_1 = require("crypto-lib/dist/async/serializer");
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
//NOTE: Exported for semasim-mobile
var getIndexedHeaderName = function (i) { return "Bundled-Data-" + i; };
function smuggleBundledDataInHeaders(data, encryptor, headers) {
    if (headers === void 0) { headers = {}; }
    var followUp = function (value) {
        var split = stringTransform.textSplit(125, urlSafeBase64encoderDecoder_1.urlSafeB64.enc(value));
        for (var i = 0; i < split.length; i++) {
            headers[getIndexedHeaderName(i)] = split[i];
        }
        return headers;
    };
    var prValueOrValue = serializer_1.stringifyThenEncryptFactory(encryptor)(data);
    return (typeof prValueOrValue === "string" ?
        followUp(prValueOrValue) :
        prValueOrValue.then(function (value) { return followUp(value); }));
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
var BundledDataSipHeaders;
(function (BundledDataSipHeaders) {
    function build(getHeaderValue) {
        var headersValues = [];
        var i = 0;
        while (true) {
            var headerName = getIndexedHeaderName(i++);
            var headerValue = getHeaderValue(headerName) ||
                getHeaderValue(headerName.toLocaleLowerCase());
            if (!headerValue) {
                break;
            }
            headersValues.push(headerValue);
        }
        return headersValues;
    }
    BundledDataSipHeaders.build = build;
})(BundledDataSipHeaders = exports.BundledDataSipHeaders || (exports.BundledDataSipHeaders = {}));
function extractBundledDataFromHeaders(headers, decryptor) {
    var split = headers instanceof Array ?
        headers :
        BundledDataSipHeaders.build(function (headerName) { return headers[headerName] || null; });
    if (!split.length) {
        throw new Error("No bundled data in header");
    }
    return serializer_1.decryptThenParseFactory(decryptor)(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(split.join("")));
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;
