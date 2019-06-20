"use strict";
/* NOTE: Used in the browser. */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var cryptoLib = require("crypto-lib");
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
var header = function (i) { return "Bundled-Data-" + i; };
function smuggleBundledDataInHeaders(data, encryptor, headers) {
    if (headers === void 0) { headers = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var split, _a, _b, _c, _d, _e, i;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _b = (_a = stringTransform).textSplit;
                    _c = [125];
                    _e = (_d = urlSafeBase64encoderDecoder_1.urlSafeB64).enc;
                    return [4 /*yield*/, cryptoLib.stringifyThenEncryptFactory(encryptor)(data)];
                case 1:
                    split = _b.apply(_a, _c.concat([_e.apply(_d, [_f.sent()])]));
                    for (i = 0; i < split.length; i++) {
                        headers[header(i)] = split[i];
                    }
                    return [2 /*return*/, headers];
            }
        });
    });
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
/** assert there is data */
function extractBundledDataFromHeaders(headers, decryptor) {
    return __awaiter(this, void 0, void 0, function () {
        var split, i, key, part;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    split = [];
                    i = 0;
                    while (true) {
                        key = header(i++);
                        part = headers[key] || headers[key.toLowerCase()];
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
                    return [4 /*yield*/, cryptoLib.decryptThenParseFactory(decryptor)(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(split.join("")))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;
