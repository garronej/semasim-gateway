import * as assert from "assert";
import * as db from "../lib/dbSemasim";
import * as types from "../lib/types";
import { types as dcTypes } from "chan-dongle-extended-client";

import * as ttTesting from "transfer-tools/dist/lib/testing";
import assertSame = ttTesting.assertSame;
import * as sqliteCustom from "sqlite-custom";

export const generateUa = (email: string = `${ttTesting.genHexStr(10)}@foo.com`): types.Ua => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "userEmail": email,
    "messagesEnabled": true
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
        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": true }
    );

    assertSame(
        await db.addUaSim(uaSim),
        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": false }
    );

    uaSim.ua.pushToken= ttTesting.genHexStr(60);

    assertSame(
        await db.addUaSim(uaSim),
        { "isFirstUaForSim": false, "isUaCreatedOrUpdated": true }
    );

    let imsi2 = "123456789123456"

    assertSame(
        await db.addUaSim({
            "imsi": imsi2,
            "ua": uaSim.ua
        }),
        { "isFirstUaForSim": true, "isUaCreatedOrUpdated": false }
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
            { "isFirstUaForSim": i === 0, "isUaCreatedOrUpdated": true }
        );

        uas.push(ua);

    }

    let sendingUa= uas[0];

    for (let i = 0; i < 5; i++) {

        let message: types.MessageTowardGsm = {
            "date": new Date(),
            "text": ttTesting.genUtf8Str(300),
            "toNumber": ttTesting.genDigits(10),
            "uaSim": {
                imsi,
                "ua": sendingUa
            },
            "appendPromotionalMessage": Date.now() % 2 === 0
        };

        await db.onSipMessage(
            message.toNumber,
            message.text,
            message.uaSim,
            message.date,
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

    const checkMark = Buffer.from("e29c94", "hex").toString("utf8");
    const crossMark = Buffer.from("e29d8c", "hex").toString("utf8");

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

        let sendDate = ( messagesTowardGsm.length%3 === 0 )?null:new Date();

        await onSent(sendDate);

        messagesTowardGsm.shift();

        await (async () => {

            let o= await db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);

            assertSame( o.length, 1);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": sendDate?checkMark:crossMark,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": {
                        "type": "SEND REPORT",
                        "messageTowardGsm": messageTowardGsm,
                        "sendDate": sendDate
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

        let bundledData: types.BundledData.ServerToClient.StatusReport = {
            "type": "STATUS REPORT",
            messageTowardGsm,
            statusReport
        };

        let __i=0;

        await (async () => {

            let o = await db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);

            assertSame(o.length, 1, "yo man" + __i++);

            let [[mts, setSent]] = o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": statusReport.isDelivered ? `${checkMark}${checkMark}` : crossMark,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
                }
            );

            await setSent();

        })();


        if (!statusReport.isDelivered) {
            continue;
        }

        let __in= false;

        for (
            let ua
            of
            uas.filter(ua => (
                    ua.userEmail === messageTowardGsm.uaSim.ua.userEmail &&
                    ua.instance !== messageTowardGsm.uaSim.ua.instance
            ))
        ) {

            __in= true;

            let o= await db.getUnsentMessagesTowardSip({ ua, imsi });

            assertSame(o.length, 1 );

            let [[mts, setSent ]]= o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": `Me: ${messageTowardGsm.text}`,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
                }
            );

            await setSent();

        }

        assert(__in);

        __in= false;

        for (
            let ua
            of
            uas.filter(ua => ua.userEmail !== messageTowardGsm.uaSim.ua.userEmail)
        ) {

            __in= true;

            let o= await db.getUnsentMessagesTowardSip({ ua, imsi });

            assertSame( o.length, 1);

            let [[mts, setSent]]= o;

            assertSame<types.MessageTowardSip>(
                mts,
                {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": `${messageTowardGsm.uaSim.ua.userEmail}: ${messageTowardGsm.text}`,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
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
            {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            }
        );

        uas.push(ua);

    }

    let messagesTowardSipSrc: types.MessageTowardSip[] = [];

    for (let i = 0; i < 3; i++) {

        let pduDate = new Date();

        let messageTowardSip: types.MessageTowardSip = {
            "bundledData": {
                "type": "MESSAGE",
                "pduDate": pduDate
            },
            "date": pduDate,
            "fromNumber": ttTesting.genDigits(10),
            "isFromDongle": true,
            "text": ttTesting.genUtf8Str(400)
        };

        assertSame(
            await db.onDongleMessage(
                messageTowardSip.fromNumber,
                messageTowardSip.text,
                messageTowardSip.date,
                imsi
            ),
            true
        );

        messagesTowardSipSrc.push(messageTowardSip);

    }

    assertSame(
        await db.lastMessageReceivedDateBySim(),
        {
            [imsi]: messagesTowardSipSrc[messagesTowardSipSrc.length - 1].date
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
        {
            "isUaCreatedOrUpdated": true,
            "isFirstUaForSim": true
        }
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
            {
                "isUaCreatedOrUpdated": true,
                "isFirstUaForSim": allowedUas.length === 1
            }
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
            "software": row["software"],
            "messagesEnabled": sqliteCustom.bool.dec(row["messages_enabled"])
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
            {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            }
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

        let [[messagesTowardSip]] =
            await db.getUnsentMessagesTowardSip({ imsi, ua });

        assertSame<types.MessageTowardSip>(
            messagesTowardSip,
            {
                "bundledData": {
                    "type": "MISSED CALL",
                    "date": messagesTowardSip.date
                },
                "date": messagesTowardSip.date,
                "fromNumber": missedCallNumber,
                "isFromDongle": false,
                "text": "Missed call"
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

        let ua: types.Ua = generateUa((i % 4 === 0) ? email : undefined);

        assertSame(
            await db.addUaSim({ imsi, ua }),
            {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            }
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

        let [[messagesTowardSip]] =
            await db.getUnsentMessagesTowardSip({ imsi, ua });

        assertSame<types.MessageTowardSip>(
            messagesTowardSip,
            {
                "bundledData": {
                    "type": "CALL ANSWERED BY",
                    "date": messagesTowardSip.date,
                    "ua": answeringUa
                },
                "date": messagesTowardSip.date,
                "fromNumber": number,
                "text": `Call answered by ${answeringUa.userEmail}`,
                "isFromDongle": false
            }
        );

    }

    console.log("ON CALL ANSWERED PASS");

}

if (require.main === module) {

    console.log("Run standalone");

    process.once("unhandledRejection", error => { throw error; });

    testDbSemasim().then(() => process.exit(0));

}




