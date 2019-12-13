"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
var db = require("../lib/dbAsterisk");
var sanityChecks_1 = require("../lib/misc/sanityChecks");
var sipRouting = require("../lib/misc/sipRouting");
var assert = require("assert");
var crypto = require("crypto");
var contact = (function () {
    var imsi = "208150113995832";
    var ua = {
        "instance": "\"<urn:uuid:a98eef4a-5a6d-41ca-8918-e1ef1819fec0>\"",
        "userEmail": "joseph.garrone.gh@gmail.com",
        "towardUserEncryptKeyStr": crypto.randomBytes(254).toString("binary"),
        "platform": "android",
        "pushToken": [
            "f_l7SPs6o7A:APA91bF_c0VGlz3pQPwrgpFe9U0FRzc",
            "VXlDmG97jt3DTzOlsjbUzsent-yeEz_QpQNhdO3Mbr-",
            "4-XxcSmyKj_Hr-XY_-LefF3RhHsSekVsSeYN95PAtwR",
            "Cpz-i1ytnc5DyMY8je4n69G"
        ].join("")
    };
    return {
        "uri": [
            "sip:" + imsi + "@192.168.1.15:35096;",
            "app-id=851039092461;",
            "pn-type=firebase;",
            "pn-tok=" + ua.pushToken + ";",
            "user_email=" + ua.userEmail + ";",
            "pn-silent=1;transport=tls"
        ].join(""),
        "path": "<sip:192.168.0.20:54632;transport=TCP;lr>,  <sip:172.31.18.20:80;transport=TLS;lr>",
        "connectionId": sipRouting.cid.generate({ "remoteAddress": "82.12.123.2", "remotePort": 23292 }),
        "uaSim": { imsi: imsi, ua: ua }
    };
})();
function testDbAsterisk() {
    return __awaiter(this, void 0, void 0, function () {
        var password, rows, _a, _b, newPassword, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    assert(sanityChecks_1.sanityChecks.contact(contact));
                    return [4 /*yield*/, db.launch()];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, db.flush()];
                case 2:
                    _d.sent();
                    return [4 /*yield*/, db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(contact.uaSim.imsi)];
                case 3:
                    password = _d.sent();
                    return [4 /*yield*/, db.queryRetryUntilSuccess(function () { return "SELECT * FROM ps_aors WHERE id= " + db.esc(contact.uaSim.imsi); })];
                case 4:
                    rows = _d.sent();
                    assert(rows.length === 1);
                    return [4 /*yield*/, db.queryRetryUntilSuccess(function () { return "SELECT * FROM ps_auths WHERE id= " + db.esc(contact.uaSim.imsi); })];
                case 5:
                    rows = _d.sent();
                    assert(rows.length === 1);
                    assert(rows[0]["username"] === contact.uaSim.imsi);
                    assert(rows[0]["password"] === password);
                    _a = assert;
                    _b = password;
                    return [4 /*yield*/, db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(contact.uaSim.imsi)];
                case 6:
                    _a.apply(void 0, [_b ===
                            (_d.sent())]);
                    newPassword = db.generateSipEndpointPassword();
                    _c = assert;
                    return [4 /*yield*/, db.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(contact.uaSim.imsi, newPassword)];
                case 7:
                    _c.apply(void 0, [(_d.sent()) === newPassword]);
                    return [4 /*yield*/, db.flush()];
                case 8:
                    _d.sent();
                    console.log("PASS ASTERISK");
                    return [2 /*return*/];
            }
        });
    });
}
exports.testDbAsterisk = testDbAsterisk;
if (require.main === module) {
    console.log("Run standalone");
    process.once("unhandledRejection", function (error) { throw error; });
    testDbAsterisk().then(function () { return process.exit(0); });
}
