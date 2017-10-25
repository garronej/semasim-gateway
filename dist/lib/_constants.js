"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dnsSrc_sips_tcp = undefined;
var c = /** @class */ (function () {
    function c() {
    }
    c.shared = (_a = /** @class */ (function () {
            function shared() {
            }
            return shared;
        }()),
        _a.gatewayPort = 80,
        _a.domain = "semasim.com",
        _a);
    c.serviceName = "semasim-gateway";
    c.dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "semasim",
        "password": "semasim"
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
    c.sipCallContext = "from-sip-call";
    c.sipMessageContext = "from-sip-message";
    c.strMissedCall = "Missed call";
    return c;
    var _a;
}());
exports.c = c;
