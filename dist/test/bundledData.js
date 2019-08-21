"use strict";
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
var ttTesting = require("transfer-tools/dist/lib/testing");
function testSerialization() {
    var e_1, _a, e_2, _b;
    var str = "foobar";
    var textB64 = "Hello World";
    {
        var types_3 = ["MESSAGE"];
        var getSample = function (type) {
            switch (type) {
                case types_3[0]: return {
                    type: type,
                    textB64: textB64,
                    "exactSendDateTime": Date.now(),
                    "appendPromotionalMessage": false
                };
            }
        };
        try {
            for (var types_1 = __values(types_3), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
                var type = types_1_1.value;
                var bundledData = getSample(type);
                ttTesting.assertSame(bundledData, JSON.parse(JSON.stringify(bundledData)));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (types_1_1 && !types_1_1.done && (_a = types_1.return)) _a.call(types_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    {
        var types_4 = [
            "MESSAGE",
            "MMS NOTIFICATION",
            "SEND REPORT",
            "STATUS REPORT",
            "MISSED CALL",
            "FROM SIP CALL SUMMARY",
            "CALL ANSWERED BY",
            "RINGBACK"
        ];
        var getSample = function (type) {
            var messageTowardGsm = {
                "dateTime": Date.now(),
                "uaSim": {
                    "ua": {
                        "instance": str,
                        "userEmail": str,
                        "towardUserEncryptKeyStr": str,
                        "platform": "android",
                        "pushToken": str,
                        "messagesEnabled": false
                    },
                    "imsi": str
                },
                "toNumber": str,
                textB64: textB64,
                "appendPromotionalMessage": false
            };
            switch (type) {
                case types_4[0]: return {
                    type: type,
                    textB64: textB64,
                    "pduDateTime": Date.now()
                };
                case types_4[1]: return {
                    type: type,
                    textB64: textB64,
                    "pduDateTime": Date.now(),
                    "wapPushMessageB64": textB64
                };
                case types_4[2]: return {
                    type: type,
                    textB64: textB64,
                    messageTowardGsm: messageTowardGsm,
                    "sendDateTime": null
                };
                case types_4[3]: return {
                    type: type,
                    textB64: textB64,
                    messageTowardGsm: messageTowardGsm,
                    "statusReport": {
                        "sendDateTime": Date.now(),
                        "dischargeDateTime": Date.now(),
                        "isDelivered": true,
                        "status": str,
                        "recipient": str
                    }
                };
                case types_4[4]: return {
                    type: type,
                    textB64: textB64,
                    "dateTime": Date.now()
                };
                case types_4[5]: return {
                    type: type,
                    textB64: textB64,
                    "callPlacedAtDateTime": Date.now(),
                    "callRingingAfterMs": 5000,
                    "callAnsweredAfterMs": 10000,
                    "callTerminatedAfterMs": 20000,
                    "ua": messageTowardGsm.uaSim.ua
                };
                case types_4[6]: return {
                    type: type,
                    textB64: textB64,
                    "dateTime": Date.now(),
                    "ua": messageTowardGsm.uaSim.ua
                };
                case types_4[7]: return {
                    type: type,
                    textB64: textB64,
                    "callId": str
                };
            }
        };
        try {
            for (var types_2 = __values(types_4), types_2_1 = types_2.next(); !types_2_1.done; types_2_1 = types_2.next()) {
                var type = types_2_1.value;
                var bundledData = getSample(type);
                ttTesting.assertSame(bundledData, JSON.parse(JSON.stringify(bundledData)));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (types_2_1 && !types_2_1.done && (_b = types_2.return)) _b.call(types_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    console.log("PASS BundledData serialization test");
}
exports.testSerialization = testSerialization;
if (require.main === module) {
    console.log("Run standalone");
    testSerialization();
}
