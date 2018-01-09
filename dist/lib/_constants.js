"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var regExpLcEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;
var c = /** @class */ (function () {
    function c() {
    }
    c.shared = (_a = /** @class */ (function () {
            function shared() {
            }
            shared.isValidEmail = function (email, mustBeLc) {
                if (mustBeLc === void 0) { mustBeLc = undefined; }
                return (typeof email === "string" &&
                    email.match(mustBeLc ? regExpLcEmail : regExpEmail) !== null);
            };
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
        "type": "adaptive",
        "params": "default"
    };
    c.sipCallContext = "from-sip-call";
    c.sipMessageContext = "from-sip-message";
    return c;
    var _a;
}());
exports.c = c;
