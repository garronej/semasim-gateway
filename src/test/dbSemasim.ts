import * as assert from "assert";
import * as db from "../lib/dbSemasim";
import * as types from "../lib/types";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as crypto from "crypto";

import * as ttTesting from "transfer-tools/dist/lib/testing";
import assertSame = ttTesting.assertSame;

const generateUa = (email: string = `${ttTesting.genHexStr(10)}@foo.com`): types.Ua => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "userEmail": email,
    "towardUserEncryptKeyStr": crypto.randomBytes(254).toString("binary")
});

export async  function testDbSemasim(){

    await db.launch();

    await new Promise(resolve=> setTimeout(()=> resolve(), 2000));

    await t1();
    await t2();
    await t3();
    await t4();
    await t5();
    await t6();
    await t7();
    await t8();

    await db.flush();

    console.log("ALL TESTS DB SEMASIM PASSED");

}

async function t1() {

    await db.flush();

    let uaSim: types.UaSim = {
        "imsi": ttTesting.genDigits(15),
        "ua": generateUa()
    };

    assertSame(
        await db.lastMessageReceivedDateBySim(),
        {}
    );

    assertSame(
        await db.addUaSim(uaSim),
        { "isFirstUaForSim": true }
    );

    assertSame(
        await db.addUaSim(uaSim),
        { "isFirstUaForSim": false }
    );

    uaSim.ua.pushToken= ttTesting.genHexStr(60);

    assertSame(
        await db.addUaSim(uaSim),
        { "isFirstUaForSim": false }
    );

    let imsi2 = "123456789123456"

    assertSame(
        await db.addUaSim({
            "imsi": imsi2,
            "ua": uaSim.ua
        }),
        { "isFirstUaForSim": true }
    );

    assertSame(
        await db.lastMessageReceivedDateBySim(),
        {
            [uaSim.imsi]: new Date(0),
            [imsi2]: new Date(0)
        }
    );

    assertSame(
        await db.getUnsentMessagesTowardGsm(uaSim.imsi),
        []
    );

    console.log("ADD UA PASS");

}

async function t2() {

    await db.flush();

    let imsi = ttTesting.genDigits(15);
    let email = `${ttTesting.genHexStr(10)}@foo.com`;

    let messagesTowardGsm: types.MessageTowardGsm[] = [];

    let uas: types.Ua[]= [];

    for( let i=0; i<10; i++ ){

        let ua= generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": i === 0 }
        );

        uas.push(ua);

    }

    let sendingUa= uas[0];

    for (let i = 0; i < 5; i++) {

        let message: types.MessageTowardGsm = {
            "dateTime": Date.now(),
            "textB64": Buffer.from(ttTesting.genUtf8Str(300), "utf8").toString("base64"),
            "toNumber": ttTesting.genDigits(10),
            "uaSim": {
                imsi,
                "ua": sendingUa
            },
            "appendPromotionalMessage": Date.now() % 2 === 0
        };

        await db.onSipMessage(
            message.toNumber,
            Buffer.from(message.textB64,"base64").toString("utf8"),
            message.uaSim,
            new Date(message.dateTime),
            message.appendPromotionalMessage
        );

        messagesTowardGsm.push(message);

    }

    assertSame(
        await db.lastMessageReceivedDateBySim(),
        {
            [imsi]: new Date(0)
        }
    );

    const [checkMark, crossMark] = [
        "e29c94",
        "e29d8c"
    ].map(code => Buffer.from(code, "hex").toString("utf8"));


    while ((await db.getUnsentMessagesTowardGsm(imsi)).length) {

        assertSame(
            (await db.getUnsentMessagesTowardGsm(imsi)).map(v => v[0]),
            messagesTowardGsm
        );

        let [messageTowardGsm, { onSent, onStatusReport }] =
            (await db.getUnsentMessagesTowardGsm(imsi))[0];

        assertSame(
            messageTowardGsm,
            messagesTowardGsm[0]
        );

        let sendDate = (messagesTowardGsm.length % 3 === 0) ? null : new Date();

        await onSent(sendDate);

        messagesTowardGsm.shift();

        await (async () => {

            let o = await db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);

            assertSame(o.length, 1);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "dateTime": mts.dateTime,
                    "isFromDongle": false,
                    "bundledData": {
                        "type": "SEND REPORT",
                        "messageTowardGsm": messageTowardGsm,
                        "sendDateTime": sendDate === null ? null : sendDate.getTime(),
                        "textB64": Buffer.from(sendDate ? checkMark : crossMark, "utf8").toString("base64")
                    }
                }
            );

            await setSent();

        })();

        if (!sendDate) {
            continue;
        }

        let statusReport: dcTypes.StatusReport;

        if (messagesTowardGsm.length % 3) {

            statusReport = {
                "dischargeDate": new Date(),
                "isDelivered": false,
                "recipient": messageTowardGsm.toNumber,
                "sendDate": sendDate,
                "status": "DELIVERED KO"
            };

        } else {

            statusReport = {
                "dischargeDate": new Date(),
                "isDelivered": true,
                "recipient": messageTowardGsm.toNumber,
                "sendDate": sendDate,
                "status": "DELIVERED OK"
            };

        }


        await onStatusReport(statusReport);

        const bundledData: types.BundledData.ServerToClient.StatusReport = {
            "type": "STATUS REPORT",
            messageTowardGsm,
            "statusReport": {
                "dischargeDateTime": statusReport.dischargeDate.getTime(),
                "isDelivered": statusReport.isDelivered,
                "recipient": statusReport.recipient,
                "sendDateTime": statusReport.sendDate.getTime(),
                "status": statusReport.status

            },
            "textB64": Buffer.from(
                statusReport.isDelivered ?
                    `${checkMark}${checkMark}` : crossMark,
                "utf8"
            ).toString("base64")
        };

        let __i = 0;

        await (async () => {

            let o = await db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);

            assertSame(o.length, 1, "yo man" + __i++);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "dateTime": mts.dateTime,
                    "isFromDongle": false,
                    bundledData
                }
            );

            await setSent();

        })();


        if (!statusReport.isDelivered) {
            continue;
        }

        let __in = false;

        for (
            let ua
            of
            uas.filter(ua => (
                ua.userEmail === messageTowardGsm.uaSim.ua.userEmail &&
                ua.instance !== messageTowardGsm.uaSim.ua.instance
            ))
        ) {

            __in = true;

            let o = await db.getUnsentMessagesTowardSip({ ua, imsi });

            assertSame(o.length, 1);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "dateTime": mts.dateTime,
                    "isFromDongle": false,
                    "bundledData": {
                        ...bundledData,
                        "textB64": Buffer.from(
                            `Me: ${Buffer.from(messageTowardGsm.textB64, "base64").toString("utf8")}`,
                            "utf8"
                        ).toString("base64")
                    }
                }
            );

            await setSent();

        }

        assert(__in);

        __in = false;

        for (
            let ua
            of
            uas.filter(ua => ua.userEmail !== messageTowardGsm.uaSim.ua.userEmail)
        ) {

            __in = true;

            let o = await db.getUnsentMessagesTowardSip({ ua, imsi });

            assertSame(o.length, 1);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "dateTime": mts.dateTime,
                    "isFromDongle": false,
                    "bundledData": {
                        ...bundledData,
                        "textB64": Buffer.from(
                            `${messageTowardGsm.uaSim.ua.userEmail}: ${Buffer.from(messageTowardGsm.textB64, "base64").toString("utf8")}`,
                            "utf8"
                        ).toString("base64")
                    }
                }
            );

            await setSent();

        }

        assert(__in);

    }

    console.log("SIP => DONGLE PASS");

}

async function t3() {

    await db.flush();

    assertSame(
        await db.onDongleMessage(
            ttTesting.genDigits(10),
            ttTesting.genUtf8Str(100),
            new Date(),
            ttTesting.genDigits(15)
        ),
        false
    );

    let imsi = ttTesting.genDigits(15);
    let email = `${ttTesting.genHexStr(10)}@foo.com`;

    let uas: types.Ua[] = [];

    for (let i = 0; i < 12; i++) {

        let ua: types.Ua = generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": i === 0 }
        );

        uas.push(ua);

    }

    let messagesTowardSipSrc: types.MessageTowardSip[] = [];

    for (let i = 0; i < 3; i++) {

        let pduDate = new Date();

        const messageTowardSip: types.MessageTowardSip = {
            "bundledData": {
                "type": "MESSAGE",
                "pduDateTime": pduDate.getTime(),
                "textB64": Buffer.from(ttTesting.genUtf8Str(400), "utf8").toString("base64")
            },
            "dateTime": pduDate.getTime(),
            "fromNumber": ttTesting.genDigits(10),
            "isFromDongle": true,
        };

        assertSame(
            await db.onDongleMessage(
                messageTowardSip.fromNumber,
                Buffer.from(messageTowardSip.bundledData.textB64, "base64").toString("utf8"),
                new Date(messageTowardSip.dateTime),
                imsi
            ),
            true
        );

        messagesTowardSipSrc.push(messageTowardSip);

    }

    assertSame(
        await db.lastMessageReceivedDateBySim(),
        {
            [imsi]: new Date(messagesTowardSipSrc[messagesTowardSipSrc.length - 1].dateTime)
        }
    );

    for (let ua of uas) {

        let messagesTowardSip = [...messagesTowardSipSrc];

        assertSame(
            (await db.getUnsentMessagesTowardSip({ imsi, ua }))
                .map(v => v[0]),
            messagesTowardSip
        );

        while ((await db.getUnsentMessagesTowardSip({ imsi, ua })).length) {

            let [[messageTowardSip, onSent]] =
                await db.getUnsentMessagesTowardSip({ imsi, ua });

            assertSame(
                messageTowardSip,
                messagesTowardSip[0]
            );

            await onSent();

            messagesTowardSip.shift();

        }


    }

    console.log("SIP <= DONGLE PASS");

}

async function t4() {

    await db.flush();

    let uaSimExt: types.UaSim = {
        "imsi": ttTesting.genDigits(15),
        "ua": generateUa()
    };

    assertSame(
        await db.addUaSim(uaSimExt),
        { "isFirstUaForSim": true }
    );

    let imsi = ttTesting.genDigits(15);

    let allowedUas: types.Ua[] = [];

    for (let i = 0; i < 15; i++) {

        let ua = generateUa();

        if (allowedUas.length < 10) {
            allowedUas.push(ua);
        }

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": allowedUas.length === 1 }
        );

    }

    await db.removeUaSim(imsi, allowedUas);

    let remainingUas: types.Ua[] = [];
    let notAffectedUas: types.Ua[] = [];

    let rows = await db._.query([
        "SELECT ua.*, ua_sim.imsi",
        "FROM ua",
        "INNER JOIN ua_sim ON ua_sim.ua= ua.id_",
        "GROUP BY ua.id_"
    ].join("\n"));

    for (let row of rows) {

        let ua = {
            "instance": row["instance"],
            "userEmail": row["user_email"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"]
        };

        if (row["imsi"] === imsi) {

            remainingUas.push(ua);

        } else {

            notAffectedUas.push(ua);
        }

    }

    assertSame(
        remainingUas,
        allowedUas
    );

    assertSame(
        notAffectedUas,
        [uaSimExt.ua]
    );

    console.log("REMOVING UAS PASS");

}

async function t5() {

    await db.flush();

    let imsi = ttTesting.genDigits(15);
    let email = `${ttTesting.genHexStr(10)}@foo.com`;

    let uas: types.Ua[] = [];

    for (let i = 0; i < 12; i++) {

        let ua: types.Ua = generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": i === 0 }
        );

        uas.push(ua);

    }

    let missedCallNumber = ttTesting.genDigits(10);

    await db.onMissedCall(imsi, missedCallNumber);

    for (let ua of uas) {

        assertSame(
            (await db.getUnsentMessagesTowardSip({ imsi, ua })).length,
            1
        )

        let [[messageTowardSip]] =
            await db.getUnsentMessagesTowardSip({ imsi, ua });

        assertSame<types.MessageTowardSip>(
            messageTowardSip,
            {
                "bundledData": {
                    "type": "MISSED CALL",
                    "dateTime": messageTowardSip.dateTime,
                    "textB64": Buffer.from("Missed call", "utf8").toString("base64")
                },
                "dateTime": messageTowardSip.dateTime,
                "fromNumber": missedCallNumber,
                "isFromDongle": false
            }
        );

    }

    console.log("NOTIFICATIONS ON MISSED CALL PASS");

}

async function t6() {

    await db.flush();

    let imsi = ttTesting.genDigits(15);
    let email = `${ttTesting.genHexStr(10)}@foo.com`;

    let ringingUas: types.Ua[] = [];

    for (let i = 0; i < 12; i++) {

        let ua = generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": i === 0 }
        );

        ringingUas.push(ua);

    }

    let answeringUa = ringingUas.shift()!;

    let number = ttTesting.genDigits(10);

    await db.onCallAnswered(number, imsi, answeringUa, ringingUas);

    for (
        let ua
        of
        ringingUas.filter(
            ({ userEmail }) => userEmail !== answeringUa.userEmail
        )
    ) {

        assertSame(
            (await db.getUnsentMessagesTowardSip({ imsi, ua })).length,
            1
        );

        let [[messageTowardSip]] =
            await db.getUnsentMessagesTowardSip({ imsi, ua });

        assertSame<types.MessageTowardSip>(
            messageTowardSip,
            {
                "bundledData": {
                    "type": "CALL ANSWERED BY",
                    "dateTime": messageTowardSip.dateTime,
                    "ua": answeringUa,
                    "textB64": Buffer.from(`Call answered by ${answeringUa.userEmail}`, "utf8").toString("base64")
                },
                "dateTime": messageTowardSip.dateTime,
                "fromNumber": number,
                "isFromDongle": false
            }
        );

    }

    console.log("ON CALL ANSWERED PASS");

}

async function t7() {

    await db.flush();

    let imsi = ttTesting.genDigits(15);
    let email = `${ttTesting.genHexStr(10)}@foo.com`;

    let uas: types.Ua[] = [];

    for (let i = 0; i < 12; i++) {

        let ua: types.Ua = generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            { "isFirstUaForSim": i === 0 }
        );

        uas.push(ua);

    }

    const number = ttTesting.genDigits(10);

    const callPlacedAtDateTime = Date.now();
    const callRingingAfterMs = 1000;
    const callAnsweredAfterMs = 5000;
    const callTerminatedAfterMs = 60000;

    await db.onCallFromSipTerminated(
        number,
        imsi,
        callPlacedAtDateTime,
        callRingingAfterMs,
        callAnsweredAfterMs,
        callTerminatedAfterMs,
        uas[0]
    );

    const tasks: Promise<void>[] = [];

    for (const ua of uas) {

        tasks[tasks.length] = (async () => {

            assertSame(
                (await db.getUnsentMessagesTowardSip({ imsi, ua })).length,
                1
            );

            const o =
                await db.getUnsentMessagesTowardSip({ imsi, ua });

            assertSame(o.length, 1);

            const [[messageTowardSip]] = o;

            const { textB64 } = messageTowardSip.bundledData;

            assertSame<types.MessageTowardSip>(
                messageTowardSip,
                {
                    "bundledData": {
                        "type": "FROM SIP CALL SUMMARY",
                        callPlacedAtDateTime,
                        callRingingAfterMs,
                        callAnsweredAfterMs,
                        callTerminatedAfterMs,
                        textB64,
                        "ua": uas[0]
                    },
                    "dateTime": messageTowardSip.dateTime,
                    "fromNumber": number,
                    "isFromDongle": false
                }
            );

        })();

    }

    await Promise.all(tasks);

    console.log("NOTIFICATIONS SIP CALL SUMMARY PASS");

}

async function t8() {

    await db.flush();

    const uasPreGenerated = new Array(12).fill("").map(() => generateUa());

    for (const imsi of new Array(10).fill("").map(() => ttTesting.genDigits(15))) {

        const uas: types.Ua[] = [];

        for (let i = 0; i < 16; i++) {

            const ua: types.Ua = generateUa();

            await db.addUaSim({ imsi, ua }),

            uas.push(ua);

        }

        for( const ua of uasPreGenerated ){

            await db.addUaSim({ imsi, ua }),

            uas.push(ua);

        }

        assertSame(
            await db.getUas(imsi),
            uas
        );

    }

    console.log("GET UA TEST PASS");

}

if (require.main === module) {

    console.log("Run standalone");

    process.once("unhandledRejection", error => { throw error; });

    testDbSemasim().then(() => process.exit(0));

}




