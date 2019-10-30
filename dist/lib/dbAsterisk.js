"use strict";
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
var sqliteCustom = require("sqlite-custom");
var i = require("../bin/installer");
var logger = require("logger");
var debug = logger.debugFactory();
var crypto = require("crypto");
var runExclusive = require("run-exclusive");
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
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sqliteCustom.connectAndGetApi(i.ast_db_path)];
                case 1:
                    api = _a.sent();
                    return [4 /*yield*/, api.query("DELETE FROM ps_contacts")];
                case 2:
                    _a.sent();
                    exports.queryRetryUntilSuccess = runExclusive.build(function (buildSql) { return __awaiter(_this, void 0, void 0, function () {
                        var sql, out, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    sql = buildSql();
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 5]);
                                    return [4 /*yield*/, api.query(sql)];
                                case 2:
                                    out = _a.sent();
                                    return [3 /*break*/, 5];
                                case 3:
                                    error_1 = _a.sent();
                                    debug(error_1.stack);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                                case 4:
                                    _a.sent();
                                    return [2 /*return*/, exports.queryRetryUntilSuccess(buildSql)];
                                case 5: return [2 /*return*/, out];
                            }
                        });
                    }); });
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
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.queryRetryUntilSuccess(function () {
                        var sql = [
                            "DELETE FROM ps_aors;",
                            "DELETE FROM ps_auths;",
                            "DELETE FROM ps_contacts;",
                            "DELETE FROM ps_endpoints;",
                        ].join("\n");
                        return sql;
                    })];
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
                case 0: return [4 /*yield*/, exports.queryRetryUntilSuccess(function () {
                        var sql = [
                            "DELETE FROM ps_contacts",
                            "WHERE uri=" + exports.esc(contact.uri.replace(/;/g, "^3B"))
                        ].join("\n");
                        return sql;
                    })];
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
    return crypto.randomBytes(16).toString("hex");
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
        var buildSql, password;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    buildSql = function () {
                        var sql = "";
                        {
                            var table = "ps_auths";
                            var values = {
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
                        var ps_endpoints = {
                            "disallow": "all",
                            "context": voiceCallBridge_1.sipCallContext,
                            "message_context": sipMessagesMonitor_1.dialplanContext,
                            "auth": imsi,
                            "from_domain": i.getBaseDomain(),
                            "ice_support": "yes",
                            "transport": "transport-tcp",
                            "dtmf_mode": "info",
                            "allow": "alaw:10,ulaw:10",
                            "id": imsi,
                            "aors": imsi,
                            "use_avpf": "yes",
                            "media_encryption": "dtls",
                            "dtls_ca_file": i.ca_crt_path,
                            "dtls_cert_file": i.host_pem_path,
                            "dtls_verify": "fingerprint",
                            "dtls_setup": "actpass",
                            "media_use_received_transport": "yes",
                            "rtcp_mux": "yes"
                        };
                        sql += exports.buildInsertQuery("ps_aors", {
                            "id": ps_endpoints.aors,
                            "max_contacts": 30,
                            "qualify_frequency": 0,
                            "support_path": "yes"
                        }, "IGNORE");
                        sql += exports.buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");
                        sql += "SELECT password FROM ps_auths WHERE id= " + exports.esc(imsi);
                        return sql;
                    };
                    return [4 /*yield*/, exports.queryRetryUntilSuccess(buildSql)];
                case 1:
                    password = (_a.sent()).pop()[0].password;
                    return [2 /*return*/, password];
            }
        });
    });
}
exports.createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword = createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword;
