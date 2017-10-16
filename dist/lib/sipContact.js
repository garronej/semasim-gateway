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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var sipLibrary = require("../tools/sipLibrary");
var db = require("./db");
var _debug = require("debug");
var debug = _debug("_sipContact");
var PsContact;
(function (PsContact) {
    function buildUserAgentFieldValue(wrap) {
        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64");
    }
    PsContact.buildUserAgentFieldValue = buildUserAgentFieldValue;
    function parseWrapped(user_agent) {
        return JSON.parse((new Buffer(user_agent, "base64")).toString("utf8"));
    }
    PsContact.parseWrapped = parseWrapped;
    function readPushNotification(uri) {
        var params = sipLibrary.parseUri(uri).params;
        var type = params["pn-type"];
        var token = params["pn-tok"];
        if (type === null || token === null)
            return undefined;
        return { type: type, token: token };
    }
    function buildContact(psContact) {
        return __awaiter(this, void 0, void 0, function () {
            var uri, imei, _a, ua_instance, ua_software, connectionId, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        uri = psContact.uri.replace(/\^3B/g, ";");
                        imei = psContact.endpoint;
                        _a = parseWrapped(psContact.user_agent), ua_instance = _a.ua_instance, ua_software = _a.ua_software, connectionId = _a.connectionId;
                        _b = {
                            "id": psContact.id,
                            uri: uri,
                            "path": psContact.path.replace(/\^3B/g, ";"),
                            connectionId: connectionId
                        };
                        _c = "uaEndpoint";
                        _d = {
                            "ua": {
                                "instance": ua_instance,
                                "software": ua_software,
                                "pushToken": readPushNotification(uri)
                            }
                        };
                        _e = "endpoint";
                        _g = (_f = db.semasim).getEndpoint;
                        _h = {
                            "dongle": { imei: imei }
                        };
                        _j = "sim";
                        _k = {};
                        _l = "iccid";
                        return [4 /*yield*/, db.asterisk.getIccidOfEndpoint(imei)];
                    case 1: return [4 /*yield*/, _g.apply(_f, [(_h[_j] = (_k[_l] = _m.sent(), _k),
                                _h)])];
                    case 2: return [2 /*return*/, (_b[_c] = (_d[_e] = _m.sent(),
                            _d),
                            _b)];
                }
            });
        });
    }
    PsContact.buildContact = buildContact;
})(PsContact = exports.PsContact || (exports.PsContact = {}));
var Contact;
(function (Contact) {
    var UaEndpoint;
    (function (UaEndpoint) {
        function areSame(o1, o2) {
            return id(o1) === id(o2);
        }
        UaEndpoint.areSame = areSame;
        function id(o) {
            return JSON.stringify([
                Endpoint.id(o.endpoint),
                o.ua.instance,
            ]);
        }
        UaEndpoint.id = id;
        var Ua;
        (function (Ua) {
            var PushToken;
            (function (PushToken) {
                function stringify(pushToken) {
                    if (pushToken === undefined) {
                        return null;
                    }
                    else {
                        return JSON.stringify(pushToken);
                    }
                }
                PushToken.stringify = stringify;
                ;
                function parse(str) {
                    if (str === null) {
                        return undefined;
                    }
                    else {
                        return JSON.parse(str);
                    }
                }
                PushToken.parse = parse;
            })(PushToken = Ua.PushToken || (Ua.PushToken = {}));
        })(Ua = UaEndpoint.Ua || (UaEndpoint.Ua = {}));
        var Endpoint;
        (function (Endpoint) {
            function id(o) {
                return JSON.stringify([o.dongle.imei, o.sim.iccid]);
            }
            Endpoint.id = id;
            function areSame(o1, o2) {
                return id(o1) === id(o2);
            }
            Endpoint.areSame = areSame;
        })(Endpoint = UaEndpoint.Endpoint || (UaEndpoint.Endpoint = {}));
    })(UaEndpoint = Contact.UaEndpoint || (Contact.UaEndpoint = {}));
})(Contact = exports.Contact || (exports.Contact = {}));
