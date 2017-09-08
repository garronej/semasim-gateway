"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var c = /** @class */ (function () {
    function c() {
    }
    c.shared = (_a = /** @class */ (function () {
            function shared() {
            }
            return shared;
        }()),
        _a.backendSipProxyListeningPortForGateways = 50610,
        _a.flowTokenKey = "flowtoken",
        _a.backendHostname = "semasim.com",
        _a.reg_expires = 21601,
        _a.regExpImei = /^[0-9]{15}$/,
        _a.regExpFourDigits = /^[0-9]{4}$/,
        _a);
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
    //TODO: not defined here get from chan-dongle-extended-client
    c.dongleCallContext = "from-dongle";
    c.phoneNumber = "_[+0-9].";
    c.sipCallContext = "from-sip-call";
    c.sipMessageContext = "from-sip-message";
    c.strMissedCall = "This correspondent tried to reach you but hanged up before the call could be forwarded.";
    return c;
    var _a;
}());
exports.c = c;
