"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sqliteCustom = require("sqlite-custom");
var md5 = require("md5");
var i = require("../bin/installer");
var voiceCallBridge_1 = require("./voiceCallBridge");
var sipMessagesMonitor_1 = require("./sipMessagesMonitor");
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = function () { return Promise.resolve(); };
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
function launch() {
    return __awaiter(this, void 0, void 0, function () {
        var api;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sqliteCustom.connectAndGetApi(i.ast_db_path)];
                case 1:
                    api = _a.sent();
                    return [4 /*yield*/, api.query("DELETE FROM ps_contacts")];
                case 2:
                    _a.sent();
                    exports.query = api.query;
                    exports.esc = api.esc;
                    exports.buildInsertQuery = api.buildInsertQuery;
                    exports.buildInsertOrUpdateQueries = api.buildInsertOrUpdateQueries;
                    beforeExit.impl = function () { return api.close(); };
                    return [2 /*return*/];
            }
        });
    });
}
exports.launch = launch;
/** for test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function () {
        var sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "DELETE FROM ps_aors;",
                        "DELETE FROM ps_auths;",
                        "DELETE FROM ps_contacts;",
                        "DELETE FROM ps_endpoints;",
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.flush = flush;
function deleteContact(contact) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.query([
                        "DELETE FROM ps_contacts",
                        "WHERE uri=" + exports.esc(contact.uri.replace(/;/g, "^3B"))
                    ].join("\n"))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteContact = deleteContact;
/** Helper function to generate a sip password */
function generateSipEndpointPassword() {
    return md5("" + Math.random());
}
exports.generateSipEndpointPassword = generateSipEndpointPassword;
/**
 *
 * If endpoint does not exist it is created.
 * If no password was provided one is generated.
 *
 * If endpoint does exist and a password is
 * provided then the old password is replaced
 * by the one provided.
 * If no password was provided nothing is updated.
 *
 * return the current password
 *
 *
 */
function createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi, newPassword) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1, _a, sql, table, values, _b, ps_endpoints_web, ps_endpoints_mobile, _c, _d, ps_endpoints, password;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    sql = "";
                    {
                        table = "ps_auths";
                        values = {
                            "id": imsi,
                            "auth_type": "userpass",
                            "username": imsi,
                            "realm": "semasim"
                        };
                        if (newPassword !== undefined) {
                            values["password"] = newPassword;
                            sql += exports.buildInsertOrUpdateQueries(table, values, ["id"]);
                        }
                        else {
                            values["password"] = generateSipEndpointPassword();
                            sql += exports.buildInsertQuery(table, values, "IGNORE");
                        }
                    }
                    _b = __read((function () {
                        var ps_endpoints_base = {
                            "disallow": "all",
                            "context": voiceCallBridge_1.sipCallContext,
                            "message_context": sipMessagesMonitor_1.dialplanContext,
                            "auth": imsi,
                            "from_domain": i.getBaseDomain(),
                            "ice_support": "yes",
                            "transport": "transport-tcp",
                            "dtmf_mode": "info"
                        };
                        var webId = imsi + "-webRTC";
                        return [__assign({ "allow": "alaw,ulaw", "id": webId, "aors": webId }, ps_endpoints_base, { "use_avpf": "yes", "media_encryption": "dtls", "dtls_ca_file": i.ca_crt_path, "dtls_cert_file": i.host_pem_path, "dtls_verify": "fingerprint", "dtls_setup": "actpass", "media_use_received_transport": "yes", "rtcp_mux": "yes" }), __assign({ "allow": "alaw,ulaw", "id": imsi, "aors": imsi }, ps_endpoints_base)];
                        /*
                        TODO: We have witnessed an often poor quality
                        of the audio from GSM to Linphone on galaxy
                        S4 on Android lollipop but maybe it's just
                        a problem caused by the test units themselves
                        and not a general case. Do further investigations.
                        Changing the codec could solve the problem.
                        Asterisk is currently compiled with all free
                        audio codecs ( list displayed on Asterisk startup )
                        so we can perform tests easily.
                        */
                    })(), 2), ps_endpoints_web = _b[0], ps_endpoints_mobile = _b[1];
                    try {
                        for (_c = __values([ps_endpoints_mobile, ps_endpoints_web]), _d = _c.next(); !_d.done; _d = _c.next()) {
                            ps_endpoints = _d.value;
                            sql += exports.buildInsertQuery("ps_aors", {
                                "id": ps_endpoints.aors,
                                "max_contacts": 30,
                                "qualify_frequency": 0,
                                "support_path": "yes"
                            }, "IGNORE");
                            sql += exports.buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    sql += "SELECT password FROM ps_auths WHERE id= " + exports.esc(imsi);
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    password = (_e.sent()).pop()[0].password;
                    return [2 /*return*/, password];
            }
        });
    });
}
exports.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword = createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword;
