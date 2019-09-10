
import { BundledData, MessageTowardGsm } from "../lib/types";
import * as ttTesting from "transfer-tools/dist/lib/testing";

export function testSerialization() {

    const str= "foobar";
    const textB64 = "Hello World";

    {

        const types = ["MESSAGE", "CONVERSATION CHECKED OUT"] as const;

        const getSample = (type: BundledData.ClientToServer["type"]): BundledData.ClientToServer => {

            switch (type) {
                case types[0]: return {
                    type,
                    textB64,
                    "exactSendDateTime": Date.now(),
                    "appendPromotionalMessage": false
                };
                case types[1]: return {
                    type,
                    textB64,
                    "checkedOutAtTime": Date.now()
                };
            }

        };

        for (const type of types) {

            const bundledData = getSample(type);

            ttTesting.assertSame(
                bundledData,
                JSON.parse(JSON.stringify(bundledData))
            );

        }

    }

    {

        const types = [
            "MESSAGE",
            "MMS NOTIFICATION",
            "SEND REPORT",
            "STATUS REPORT",
            "MISSED CALL",
            "FROM SIP CALL SUMMARY",
            "CALL ANSWERED BY",
            "RINGBACK",
            "CONVERSATION CHECKED OUT FROM OTHER UA"
        ] as const;

        const getSample = (type: BundledData.ServerToClient["type"]): BundledData.ServerToClient => {

            const messageTowardGsm: MessageTowardGsm = {
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
                textB64,
                "appendPromotionalMessage": false
            };

            switch (type) {
                case types[0]: return {
                    type,
                    textB64,
                    "pduDateTime": Date.now()
                };
                case types[1]: return {
                    type,
                    textB64,
                    "pduDateTime": Date.now(),
                    "wapPushMessageB64": textB64
                };
                case types[2]: return {
                    type,
                    textB64,
                    messageTowardGsm,
                    "sendDateTime": null
                };
                case types[3]: return {
                    type,
                    textB64,
                    messageTowardGsm,
                    "statusReport": {
                        "sendDateTime": Date.now(),
                        "dischargeDateTime": Date.now(),
                        "isDelivered": true,
                        "status": str,
                        "recipient": str
                    }
                };
                case types[4]: return {
                    type,
                    textB64,
                    "dateTime": Date.now()
                };
                case types[5]: return {
                    type,
                    textB64,
                    "callPlacedAtDateTime": Date.now(),
                    "callRingingAfterMs": 5000,
                    "callAnsweredAfterMs": 10000, 
                    "callTerminatedAfterMs": 20000,
                    "ua": messageTowardGsm.uaSim.ua
                };
                case types[6]: return {
                    type,
                    textB64,
                    "dateTime": Date.now(),
                    "ua": messageTowardGsm.uaSim.ua
                };
                case types[7]: return {
                    type,
                    textB64,
                    "callId": str
                };
                case types[8]: return {
                    type,
                    textB64,
                    "checkedOutAtTime": Date.now()
                };

            }

        };

        for (const type of types) {

            const bundledData = getSample(type);

            ttTesting.assertSame(
                bundledData,
                JSON.parse(JSON.stringify(bundledData))
            );

        }

    }

    console.log("PASS BundledData serialization test");

}

if (require.main === module) {

    console.log("Run standalone");

    testSerialization();


}
