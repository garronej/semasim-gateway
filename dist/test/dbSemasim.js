"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../lib/dbSemasim");
const ttTesting = require("transfer-tools/dist/lib/testing");
var assertSame = ttTesting.assertSame;
exports.generateUa = (email = `${ttTesting.genHexStr(10)}@foo.com`) => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "software": ttTesting.genHexStr(20),
    "userEmail": email
});
function testDbSemasim() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.launch();
        yield new Promise(resolve => setTimeout(() => resolve(), 2000));
        yield t1();
        yield t2();
        yield t3();
        yield t4();
        yield t5();
        yield t6();
        yield db.flush();
        console.log("ALL TESTS DB SEMASIM PASSED");
    });
}
exports.testDbSemasim = testDbSemasim;
function t1() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        let uaSim = {
            "imsi": ttTesting.genDigits(15),
            "ua": exports.generateUa()
        };
        assertSame(yield db.lastMessageReceivedDateBySim(), {});
        assertSame(yield db.addUaSim(uaSim), { "isFirstUaForSim": true, "isUaCreatedOrUpdated": true });
        assertSame(yield db.addUaSim(uaSim), { "isFirstUaForSim": false, "isUaCreatedOrUpdated": false });
        uaSim.ua.software = "...";
        assertSame(yield db.addUaSim(uaSim), { "isFirstUaForSim": false, "isUaCreatedOrUpdated": true });
        let imsi2 = "123456789123456";
        assertSame(yield db.addUaSim({
            "imsi": imsi2,
            "ua": uaSim.ua
        }), { "isFirstUaForSim": true, "isUaCreatedOrUpdated": false });
        assertSame(yield db.lastMessageReceivedDateBySim(), {
            [uaSim.imsi]: new Date(0),
            [imsi2]: new Date(0)
        });
        assertSame(yield db.getUnsentMessagesTowardGsm(uaSim.imsi), []);
        console.log("ADD UA PASS");
    });
}
function t2() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        let imsi = ttTesting.genDigits(15);
        let email = `${ttTesting.genHexStr(10)}@foo.com`;
        let messagesTowardGsm = [];
        let uas = [];
        for (let i = 0; i < 10; i++) {
            let ua = exports.generateUa((i % 4 === 0) ? email : undefined);
            assertSame(yield db.addUaSim({ imsi, ua }), { "isFirstUaForSim": i === 0, "isUaCreatedOrUpdated": true });
            uas.push(ua);
        }
        let sendingUa = uas[0];
        for (let i = 0; i < 5; i++) {
            let message = {
                "date": new Date(),
                "text": ttTesting.genUtf8Str(300),
                "toNumber": ttTesting.genDigits(10),
                "uaSim": {
                    imsi,
                    "ua": sendingUa
                }
            };
            yield db.onSipMessage(message.toNumber, message.text, message.uaSim, message.date);
            messagesTowardGsm.push(message);
        }
        assertSame(yield db.lastMessageReceivedDateBySim(), {
            [imsi]: new Date(0)
        });
        const checkMark = Buffer.from("e29c94", "hex").toString("utf8");
        const crossMark = Buffer.from("e29d8c", "hex").toString("utf8");
        while ((yield db.getUnsentMessagesTowardGsm(imsi)).length) {
            assertSame((yield db.getUnsentMessagesTowardGsm(imsi)).map(v => v[0]), messagesTowardGsm);
            let [messageTowardGsm, { onSent, onStatusReport }] = (yield db.getUnsentMessagesTowardGsm(imsi))[0];
            assertSame(messageTowardGsm, messagesTowardGsm[0]);
            let sendDate = (messagesTowardGsm.length % 3 === 0) ? null : new Date();
            yield onSent(sendDate);
            messagesTowardGsm.shift();
            yield (() => __awaiter(this, void 0, void 0, function* () {
                let o = yield db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);
                assertSame(o.length, 1);
                let [[mts, setSent]] = o;
                assertSame(mts, {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": sendDate ? checkMark : crossMark,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": {
                        "type": "SEND REPORT",
                        "messageTowardGsm": messageTowardGsm,
                        "sendDate": sendDate
                    }
                });
                yield setSent();
            }))();
            if (!sendDate) {
                continue;
            }
            let statusReport;
            if (messagesTowardGsm.length % 3) {
                statusReport = {
                    "dischargeDate": new Date(),
                    "isDelivered": false,
                    "recipient": messageTowardGsm.toNumber,
                    "sendDate": sendDate,
                    "status": "DELIVERED KO"
                };
            }
            else {
                statusReport = {
                    "dischargeDate": new Date(),
                    "isDelivered": true,
                    "recipient": messageTowardGsm.toNumber,
                    "sendDate": sendDate,
                    "status": "DELIVERED OK"
                };
            }
            yield onStatusReport(statusReport);
            let bundledData = {
                "type": "STATUS REPORT",
                messageTowardGsm,
                statusReport
            };
            let __i = 0;
            yield (() => __awaiter(this, void 0, void 0, function* () {
                let o = yield db.getUnsentMessagesTowardSip(messageTowardGsm.uaSim);
                assertSame(o.length, 1, "yo man" + __i++);
                let [[mts, setSent]] = o;
                assertSame(mts, {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": statusReport.isDelivered ? `${checkMark}${checkMark}` : crossMark,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
                });
                yield setSent();
            }))();
            if (!statusReport.isDelivered) {
                continue;
            }
            let __in = false;
            for (let ua of uas.filter(ua => (ua.userEmail === messageTowardGsm.uaSim.ua.userEmail &&
                ua.instance !== messageTowardGsm.uaSim.ua.instance))) {
                __in = true;
                let o = yield db.getUnsentMessagesTowardSip({ ua, imsi });
                assertSame(o.length, 1);
                let [[mts, setSent]] = o;
                assertSame(mts, {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": `Me: ${messageTowardGsm.text}`,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
                });
                yield setSent();
            }
            console.assert(__in);
            __in = false;
            for (let ua of uas.filter(ua => ua.userEmail !== messageTowardGsm.uaSim.ua.userEmail)) {
                __in = true;
                let o = yield db.getUnsentMessagesTowardSip({ ua, imsi });
                assertSame(o.length, 1);
                let [[mts, setSent]] = o;
                assertSame(mts, {
                    "fromNumber": messageTowardGsm.toNumber,
                    "text": `${messageTowardGsm.uaSim.ua.userEmail}: ${messageTowardGsm.text}`,
                    "date": mts.date,
                    "isFromDongle": false,
                    "bundledData": bundledData
                });
                yield setSent();
            }
            console.assert(__in);
        }
        console.log("SIP => DONGLE PASS");
    });
}
function t3() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        assertSame(yield db.onDongleMessage(ttTesting.genDigits(10), ttTesting.genUtf8Str(100), new Date(), ttTesting.genDigits(15)), false);
        let imsi = ttTesting.genDigits(15);
        let email = `${ttTesting.genHexStr(10)}@foo.com`;
        let uas = [];
        for (let i = 0; i < 12; i++) {
            let ua = exports.generateUa((i % 4 === 0) ? email : undefined);
            assertSame(yield db.addUaSim({ imsi, ua }), {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            });
            uas.push(ua);
        }
        let messagesTowardSipSrc = [];
        for (let i = 0; i < 3; i++) {
            let pduDate = new Date();
            let messageTowardSip = {
                "bundledData": {
                    "type": "MESSAGE",
                    "pduDate": pduDate
                },
                "date": pduDate,
                "fromNumber": ttTesting.genDigits(10),
                "isFromDongle": true,
                "text": ttTesting.genUtf8Str(400)
            };
            assertSame(yield db.onDongleMessage(messageTowardSip.fromNumber, messageTowardSip.text, messageTowardSip.date, imsi), true);
            messagesTowardSipSrc.push(messageTowardSip);
        }
        assertSame(yield db.lastMessageReceivedDateBySim(), {
            [imsi]: messagesTowardSipSrc[messagesTowardSipSrc.length - 1].date
        });
        for (let ua of uas) {
            let messagesTowardSip = [...messagesTowardSipSrc];
            assertSame((yield db.getUnsentMessagesTowardSip({ imsi, ua }))
                .map(v => v[0]), messagesTowardSip);
            while ((yield db.getUnsentMessagesTowardSip({ imsi, ua })).length) {
                let [[messageTowardSip, onSent]] = yield db.getUnsentMessagesTowardSip({ imsi, ua });
                assertSame(messageTowardSip, messagesTowardSip[0]);
                yield onSent();
                messagesTowardSip.shift();
            }
        }
        console.log("SIP <= DONGLE PASS");
    });
}
function t4() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        let uaSimExt = {
            "imsi": ttTesting.genDigits(15),
            "ua": exports.generateUa()
        };
        assertSame(yield db.addUaSim(uaSimExt), {
            "isUaCreatedOrUpdated": true,
            "isFirstUaForSim": true
        });
        let imsi = ttTesting.genDigits(15);
        let allowedUas = [];
        for (let i = 0; i < 15; i++) {
            let ua = exports.generateUa();
            if (allowedUas.length < 10) {
                allowedUas.push(ua);
            }
            assertSame(yield db.addUaSim({ imsi, ua }), {
                "isUaCreatedOrUpdated": true,
                "isFirstUaForSim": allowedUas.length === 1
            });
        }
        yield db.removeUaSim(imsi, allowedUas);
        let remainingUas = [];
        let notAffectedUas = [];
        let rows = yield db._.query([
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
                "software": row["software"]
            };
            if (row["imsi"] === imsi) {
                remainingUas.push(ua);
            }
            else {
                notAffectedUas.push(ua);
            }
        }
        assertSame(remainingUas, allowedUas);
        assertSame(notAffectedUas, [uaSimExt.ua]);
        console.log("REMOVING UAS PASS");
    });
}
function t5() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        let imsi = ttTesting.genDigits(15);
        let email = `${ttTesting.genHexStr(10)}@foo.com`;
        let uas = [];
        for (let i = 0; i < 12; i++) {
            let ua = exports.generateUa((i % 4 === 0) ? email : undefined);
            assertSame(yield db.addUaSim({ imsi, ua }), {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            });
            uas.push(ua);
        }
        let missedCallNumber = ttTesting.genDigits(10);
        yield db.onMissedCall(imsi, missedCallNumber);
        for (let ua of uas) {
            assertSame((yield db.getUnsentMessagesTowardSip({ imsi, ua })).length, 1);
            let [[messagesTowardSip]] = yield db.getUnsentMessagesTowardSip({ imsi, ua });
            assertSame(messagesTowardSip, {
                "bundledData": {
                    "type": "MISSED CALL",
                    "date": messagesTowardSip.date
                },
                "date": messagesTowardSip.date,
                "fromNumber": missedCallNumber,
                "isFromDongle": false,
                "text": "Missed call"
            });
        }
        console.log("NOTIFICATIONS ON MISSED CALL PASS");
    });
}
function t6() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        let imsi = ttTesting.genDigits(15);
        let email = `${ttTesting.genHexStr(10)}@foo.com`;
        let ringingUas = [];
        for (let i = 0; i < 12; i++) {
            let ua = exports.generateUa((i % 4 === 0) ? email : undefined);
            assertSame(yield db.addUaSim({ imsi, ua }), {
                "isFirstUaForSim": i === 0,
                "isUaCreatedOrUpdated": true
            });
            ringingUas.push(ua);
        }
        let answeringUa = ringingUas.shift();
        let number = ttTesting.genDigits(10);
        yield db.onCallAnswered(number, imsi, answeringUa, ringingUas);
        for (let ua of ringingUas.filter(({ userEmail }) => userEmail !== answeringUa.userEmail)) {
            assertSame((yield db.getUnsentMessagesTowardSip({ imsi, ua })).length, 1);
            let [[messagesTowardSip]] = yield db.getUnsentMessagesTowardSip({ imsi, ua });
            assertSame(messagesTowardSip, {
                "bundledData": {
                    "type": "CALL ANSWERED BY",
                    "date": messagesTowardSip.date,
                    "ua": answeringUa
                },
                "date": messagesTowardSip.date,
                "fromNumber": number,
                "text": `Call answered by ${answeringUa.userEmail}`,
                "isFromDongle": false
            });
        }
        console.log("ON CALL ANSWERED PASS");
    });
}
if (require.main === module) {
    console.log("Run standalone");
    process.once("unhandledRejection", error => { throw error; });
    testDbSemasim().then(() => process.exit(0));
}
