"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dns = require("dns");
var dnsSrc_sips_tcp = undefined;
var c = /** @class */ (function () {
    function c() {
    }
    c.shared = (_a = /** @class */ (function () {
            function shared() {
            }
            Object.defineProperty(shared, "dnsSrv_sips_tcp", {
                get: function () {
                    if (dnsSrc_sips_tcp)
                        return Promise.resolve(dnsSrc_sips_tcp);
                    var ofType = dnsSrc_sips_tcp;
                    return new Promise(function (resolve, reject) {
                        dns.resolveSrv("_sips._tcp." + c.shared.domain, function (error, addresses) {
                            if (error || !addresses.length) {
                                return reject(error);
                            }
                            var _a = addresses[0], name = _a.name, port = _a.port;
                            dnsSrc_sips_tcp = { name: name, port: port };
                            resolve(dnsSrc_sips_tcp);
                        });
                    });
                },
                enumerable: true,
                configurable: true
            });
            return shared;
        }()),
        _a.gatewayPort = 80,
        _a.flowTokenKey = "flowtoken",
        _a.domain = "semasim.com",
        _a.regExpImei = /^[0-9]{15}$/,
        _a.regExpFourDigits = /^[0-9]{4}$/,
        _a);
    c.serviceName = "semasim-gateway";
    c.dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "root",
        "password": "abcde12345",
        "database": "semasim"
    };
    c.gain = "" + 4000;
    c.jitterBuffer = {
        //type: "fixed",
        //params: "2500,10000"
        //type: "fixed",
        //params: "default"
        type: "adaptive",
        params: "default"
    };
    c.phoneNumber = "_[+0-9].";
    c.sipCallContext = "from-sip-call";
    c.sipMessageContext = "from-sip-message";
    c.strMissedCall = "This correspondent tried to reach you but hanged up before the call could be forwarded.";
    return c;
    var _a;
}());
exports.c = c;
