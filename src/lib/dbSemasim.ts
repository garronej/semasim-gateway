import * as sqliteCustom from "sqlite-custom";

import * as types from "./types";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as i from "../bin/installer";

export let _: sqliteCustom.Api;

export function beforeExit() {
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl = () => Promise.resolve();
}

/** Must be called and awaited before use */
export async function launch(): Promise<void> {

    //sqliteCustom.enableLog();

    _ = await sqliteCustom.connectAndGetApi(
        i.semasim_db_path, "HANDLE STRING ENCODING"
    );

    beforeExit.impl = () => _.close();

}

/** Only for test purpose */
export async function flush() {

    let sql = [
        "DELETE FROM ua;",
        "DELETE FROM message_toward_sip;"
    ].join("\n");

    await _.query(sql);

}

export async function getTowardSimKeys(imsi: string): Promise<{
    encryptKeyStr: string;
    decryptKeyStr: string;
} | undefined> {

    const sql = [
        `SELECT encrypt_key, decrypt_key`,
        `FROM toward_sim_keys`,
        `WHERE imsi=${_.esc(imsi)}`
    ].join("\n");

    const [row] = await _.query(sql);

    return row !== undefined ? ({
        "encryptKeyStr": row["encrypt_key"],
        "decryptKeyStr": row["decrypt_key"]
    }) : undefined;

}

export async function setTowardSimKeys(
    imsi: string,
    encryptKeyStr: string,
    decryptKeyStr: string
): Promise<void> {

    const sql = _.buildInsertOrUpdateQueries("toward_sim_keys", {
        imsi,
        "encrypt_key": encryptKeyStr,
        "decrypt_key": decryptKeyStr
    }, ["imsi"]);

    await _.query(sql);

}


export async function addUaSim(
    uaSim: types.UaSim
): Promise<{
    isUaCreatedOrUpdated: boolean;
    isFirstUaForSim: boolean;
}> {

    let sql = "";

    let { imsi, ua } = uaSim;

    sql += _.buildInsertOrUpdateQueries("ua", {
        "instance": ua.instance,
        "user_email": ua.userEmail,
        "toward_user_encrypt_key": ua.towardUserEncryptKeyStr,
        "platform": ua.platform,
        "push_token": ua.pushToken,
        "messages_enabled": sqliteCustom.bool.enc(ua.messagesEnabled)
    }, ["instance", "user_email"]);

    sql += [
        "INSERT OR IGNORE INTO ua_sim ( ua, imsi )",
        `SELECT id_, ${_.esc(imsi)}`,
        "FROM ua",
        `WHERE instance=${_.esc(ua.instance)} AND user_email=${_.esc(ua.userEmail)}`,
        ";",
        ""
    ].join("\n");

    sql += [
        `SELECT COUNT(*) as sim_ua_count`,
        "FROM ua_sim",
        `WHERE imsi= ${_.esc(imsi)}`
    ].join("\n");

    let queryResults = await _.query(sql);

    return {
        "isUaCreatedOrUpdated": (
            !!queryResults[0].insertId ||
            !!queryResults[1].affectedRows
        ),
        "isFirstUaForSim": (
            !!queryResults[2].affectedRows &&
            queryResults[3][0]["sim_ua_count"] === 1
        )
    };

}

//TODO: refactor, it's unclear what this function does
export async function removeUaSim(
    imsi: string,
    uasToKeep: types.UaRef[] = []
) {

    let condition = uasToKeep.length ? [
        "NOT ( ",
        uasToKeep.map(
            ua => `ua.instance=${_.esc(ua.instance)} AND ua.user_email=${_.esc(ua.userEmail)}`
        ).join(" OR "),
        " )"
    ].join("") : "1";

    await _.query([
        "DELETE FROM ua_sim",
        `WHERE imsi=${_.esc(imsi)} AND ua IN ( SELECT id_ from ua WHERE ${condition} )`
    ].join("\n"));

}

/**
 * 
 * to call when sip message received.
 * 
 * @param toNumber phone number to send to
 * @param text 
 * @param uaSim uaSim that emitted the message
 * @param date this is the exactSendDate that was bundled 
 * by the client app in the SIP MESSAGE header, it is used as an id
 * so that the client find to witch message correspond the 
 * sendReport and statusReport.
 * 
 * NOTE: no new sip message added to the queue.
 * Queue a new messageTowardGsm
 * 
 */
export async function onSipMessage(
    toNumber: string,
    text: string,
    uaSim: types.UaSim,
    date: Date,
    appendPromotionalMessage: boolean
): Promise<void> {

    let sql = [
        "INSERT INTO message_toward_gsm ( date, ua_sim, to_number, text_b64, send_date, append_promotional_message)",
        `SELECT`,
        [
            _.esc(date.getTime()),
            "ua_sim.id_",
            _.esc(toNumber),
            _.esc(Buffer.from(text, "utf8").toString("base64")),
            "NULL",
            sqliteCustom.bool.enc(appendPromotionalMessage)
        ].join(", "),
        "FROM ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        "WHERE",
        [
            `ua_sim.imsi= ${_.esc(uaSim.imsi)}`,
            `ua.instance = ${_.esc(uaSim.ua.instance)}`,
            `ua.user_email= ${_.esc(uaSim.ua.userEmail)}`
        ].join(" AND "),
        ";",
        ""
    ].join("\n");

    await _.query(sql);

}

/** 
 * to call when a SMS is received by a dongle
 * 
 * Return true if there is an ua registered to this SIM.
 * If not the message is not stored in DB.
 * 
 * @param fromNumber 
 * txt       => number of who sent the SMS
 * 
 * @param text 
 * txt       => SMS
 * 
 * @param date 
 * txt       => date the SMS have been sent read from PDU
 * 
 * */
export async function onDongleMessage(
    fromNumber: string,
    text: string,
    date: Date,
    imsi: string
): Promise<boolean> {
    /*
    PDU: 07913396050066F0440B913336766883F5000491303081422040890605040B8423F000060401BEAF848C8298493863596A44335A45656D41366F5350615767676467008D928918802B33333633363738363338352F545950453D504C4D4E0086818A808F818E02095F83687474703A2F2F3231332E3232382E332E35382F6D6D732E7068703F493863596A44335A45656D41366F5350615767676467008805810303F480, 1551633844946, Sun Mar 03 2019 18:24:04 GMT+0100 (CET)
    {
      "type": 0,
      "text": "\u0000\u0006\u0004\u0001¾¯
                                         \u0018+33636786385/TYPE=PLMN\u0000\u0002\t_http://213.228.3.58/mms.php?I8cYjD3ZEemA6oSPaWggdg\u0000\u0005\u0003\u0003ô",
      "pid": 0,
      "dcs": 4,
      "csca": "+33695000660",
      "number": "+33636786385",
      "date": "2019-03-03T18:24:02.000Z",
      "fmt": -1,
      "_fmt": "UNKNOWN",
      "_type": "SMS_DELIVER"
    }
    */

    const bundledData = !!text.match(/^\0.+TYPE=.+http/) ?
        (() => {

            const out: types.BundledData.ServerToClient.MmsNotification = {
                "type": "MMS NOTIFICATION",
                "pduDateTime": date.getTime(),
                "wapPushMessageB64": Buffer.from(text,"utf8").toString("base64"),
                "textB64": Buffer.from([
                    "MMS notification received.\n",
                    "Semasim does not support MMS yet.\n",
                    "Note that some phones automatically convert long SMS into MMS.",
                    "If you suspect it is what might have happen here you could ask your",
                    "contact to send the message again splitting it into smaller parts.",
                    "All apologies for the inconvenience."
                ].join(" "), "utf8").toString("base64")
            };

            return out;

        })() : (() => {

            const out: types.BundledData.ServerToClient.Message = {
                "type": "MESSAGE",
                "pduDateTime": date.getTime(),
                "textB64": Buffer.from(text, "utf8").toString("base64")
            };

            return out;

        })()
        ;

    const sql = buildMessageTowardSipInsertQuery(
        true,
        fromNumber,
        date,
        bundledData,
        {
            "target": "ALL UA REGISTERED TO SIM",
            imsi,
            "alsoSendToUasWithMessageDisabled": false
        }
    );

    const queryResults = await _.query(sql);

    return queryResults[0].insertId !== 0;

}

/** 
 * to call when when a call have been missed
 *
 * will create the message toward sip to notify UAs about it.
 *
 * */
export async function onMissedCall(imsi: string, number: string) {

    let date = new Date();

    const bundledData: types.BundledData.ServerToClient.MissedCall = {
        "type": "MISSED CALL",
        "dateTime": date.getTime(),
        "textB64": Buffer.from("Missed call","utf8").toString("base64")
    };

    const sql = buildMessageTowardSipInsertQuery(
        false,
        number,
        date,
        bundledData,
        {
            "target": "ALL UA REGISTERED TO SIM",
            imsi,
            "alsoSendToUasWithMessageDisabled": false
        }
    );

    await _.query(sql);

}

/** 
 * 
 * to call when a call have been answered,
 * 
 * will inform ua of other users that the call have been taken.
 * 
*/
export async function onCallAnswered(
    number: string,
    imsi: string,
    answeredByUa: types.Ua,
    otherUasReachedForTheCall: Iterable<types.Ua>
): Promise<void> {

    let sql = "";

    const date = new Date();

    const bundledData: types.BundledData.ServerToClient.CallAnsweredBy = {
        "type": "CALL ANSWERED BY",
        "dateTime": date.getTime(),
        "ua": answeredByUa,
        "textB64": Buffer.from(`Call answered by ${answeredByUa.userEmail}`, "utf8").toString("base64")
    };

    for (const ua of otherUasReachedForTheCall) {

        if (ua.userEmail === answeredByUa.userEmail) {
            continue;
        }

        sql += buildMessageTowardSipInsertQuery(
            false,
            number,
            date,
            bundledData,
            {
                "target": "SPECIFIC UA REGISTERED TO SIM",
                "uaSim": { ua, imsi },
                "alsoSendToUasWithMessageDisabled": false
            }
        );

    }

    if (!sql) {
        return;
    }

    await _.query(sql);

}

/** Check if a ua registration have message pending */
export async function messageTowardSipUnsentCount(
    uaSim: types.UaSim
): Promise<number> {

    let sql = [
        "SELECT COUNT(*) AS count",
        "FROM message_toward_sip",
        "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
        "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        "WHERE",
        [
            "ua_sim_message_toward_sip.delivered_date IS NULL",
            `ua_sim.imsi= ${_.esc(uaSim.imsi)}`,
            `ua.instance= ${_.esc(uaSim.ua.instance)}`,
            `ua.user_email= ${_.esc(uaSim.ua.userEmail)}`
        ].join(" AND ")
    ].join("\n");

    return (await _.query(sql))[0]["count"];

}

/** Return array of tuples [ MessageTowardSip, <method to set the message as received> ] */
export async function getUnsentMessagesTowardSip(
    uaSim: types.UaSim
) {

    let sql = [
        "SELECT",
        "message_toward_sip.is_from_dongle,",
        "message_toward_sip.bundled_data,",
        "message_toward_sip.date,",
        "message_toward_sip.from_number,",
        "ua_sim_message_toward_sip.id_",
        "FROM message_toward_sip",
        "INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_",
        "INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        "WHERE",
        [
            "ua_sim_message_toward_sip.delivered_date IS NULL",
            `ua_sim.imsi= ${_.esc(uaSim.imsi)}`,
            `ua.instance= ${_.esc(uaSim.ua.instance)}`,
            `ua.user_email= ${_.esc(uaSim.ua.userEmail)}`
        ].join(" AND "),
        "ORDER BY message_toward_sip.date"
    ].join("\n");

    let rows = await _.query(sql);

    let out = new Array<[types.MessageTowardSip, () => Promise<void>]>();

    for (let row of rows) {

        let message: types.MessageTowardSip = {
            "dateTime": row["date"],
            "fromNumber": row["from_number"],
            "isFromDongle": sqliteCustom.bool.dec(row["is_from_dongle"]),
            "bundledData": JSON.parse(row["bundled_data"])
        };

        let onReceived = async () => {

            await _.query(
                _.buildInsertOrUpdateQueries("ua_sim_message_toward_sip", {
                    "id_": row["id_"],
                    "delivered_date": Date.now()
                }, ["id_"])
            );

        };

        out.push([message, onReceived]);

    }

    return out;

}

/** 
 * 
 * Provide the SMS that need to be send via Dongle.
 * 
 * return an array of tuple [ MessageTowardGsm, <method to set the send date and status report> ] 
 * 
 * */
export async function getUnsentMessagesTowardGsm(
    imsi: string
) {

    let rows = await _.query(
        [
            "SELECT",
            "message_toward_gsm.id_,",
            "message_toward_gsm.date,",
            "message_toward_gsm.to_number,",
            "message_toward_gsm.text_b64,",
            "message_toward_gsm.append_promotional_message,",
            "ua_sim.imsi,",
            "ua.instance,",
            "ua.user_email,",
            "ua.platform,",
            "ua.push_token,",
            "ua.toward_user_encrypt_key,",
            "ua.messages_enabled",
            "FROM message_toward_gsm",
            "INNER JOIN ua_sim ON ua_sim.id_ = message_toward_gsm.ua_sim",
            "INNER JOIN ua ON ua.id_ = ua_sim.ua",
            `WHERE ua_sim.imsi=${_.esc(imsi)} AND message_toward_gsm.send_date IS NULL`,
            "ORDER BY message_toward_gsm.date",
            ";"
        ].join("\n")
    );

    let out: [
        types.MessageTowardGsm,
        getUnsentMessagesTowardGsm.Confirm
    ][] = [];

    for (let row of rows) {

        let message: types.MessageTowardGsm = {
            "dateTime": row["date"],
            "uaSim": {
                "ua": {
                    "instance": row["instance"],
                    "userEmail": row["user_email"],
                    "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
                    "platform": row["platform"],
                    "pushToken": row["push_token"],
                    "messagesEnabled": sqliteCustom.bool.dec(row["messages_enabled"])
                },
                "imsi": row["imsi"]
            },
            "toNumber": row["to_number"],
            "textB64": row["text_b64"],
            "appendPromotionalMessage": sqliteCustom.bool.dec(
                row["append_promotional_message"]
            )
        };

        let message_toward_gsm_id_ = row["id_"];

        let setSentPr!: Promise<void>;

        out.push([
            message,
            {
                "onSent": async sendDate => {

                    setSentPr = getUnsentMessagesTowardGsm.onSent(
                        message_toward_gsm_id_,
                        message,
                        sendDate
                    );

                    await setSentPr;

                },
                "onStatusReport": async statusReport => {

                    await setSentPr;

                    await getUnsentMessagesTowardGsm.onStatusReport(
                        message,
                        statusReport
                    )

                }
            }
        ]);

    }

    return out;

}

export namespace getUnsentMessagesTowardGsm {

    export type Confirm = {
        onSent(sendDate: Date | null): Promise<void>;
        onStatusReport(statusReport: dcTypes.StatusReport): Promise<void>
    };

    const checkMark = Buffer.from("e29c94", "hex").toString("utf8");
    const crossMark = Buffer.from("e29d8c", "hex").toString("utf8");

    /**
     * 
     * Set message toward sip as received in the db and create Send report
     * 
     * sendDate correspond to the exact time the message have been sent by dongle,
     * null if send failed.
     * 
    */
    export async function onSent(
        messageTowardGsm_id: number,
        messageTowardGsm: types.MessageTowardGsm,
        sendDate: Date | null
    ) {

        let isSuccess: boolean = sendDate ? true : false;

        let sql = _.buildInsertOrUpdateQueries("message_toward_gsm", {
            "id_": messageTowardGsm_id,
            "send_date": isSuccess ? sendDate!.getTime() : -1
        }, ["id_"]);

        const bundledData: types.BundledData.ServerToClient.SendReport = {
            "type": "SEND REPORT",
            messageTowardGsm,
            "sendDateTime": sendDate === null ? null : sendDate.getTime(),
            "textB64": Buffer.from(isSuccess ? checkMark : crossMark,"utf8").toString("base64")
        };

        sql += buildMessageTowardSipInsertQuery(
            false,
            messageTowardGsm.toNumber,
            new Date(),
            bundledData,
            {
                "target": "SPECIFIC UA REGISTERED TO SIM",
                "uaSim": messageTowardGsm.uaSim,
                "alsoSendToUasWithMessageDisabled": false
            }
        );

        await _.query(sql);

    }

    export async function onStatusReport(
        messageTowardGsm: types.MessageTowardGsm,
        statusReport: dcTypes.StatusReport
    ) {

        //TODO: may be useless...depend of operator I assume
        if (isNaN(statusReport.dischargeDate.getTime())) {
            statusReport.dischargeDate = new Date();
        };

        const now = new Date();

        const build = (
            text: string,
            target: buildMessageTowardSipInsertQuery.Target
        ) => {

            const bundledData: types.BundledData.ServerToClient.StatusReport = {
                "type": "STATUS REPORT",
                messageTowardGsm,
                "statusReport":{
                    "dischargeDateTime": statusReport.dischargeDate.getTime(),
                    "isDelivered": statusReport.isDelivered,
                    "recipient": statusReport.recipient,
                    "sendDateTime": statusReport.sendDate.getTime(),
                    "status": statusReport.status
                },
                "textB64": Buffer.from(text, "utf8").toString("base64")
            };

            return buildMessageTowardSipInsertQuery(
                false,
                messageTowardGsm.toNumber,
                now,
                bundledData,
                target
            );

        };

        let sql = "";

        const alsoSendToUasWithMessageDisabled = false;

        if (statusReport.isDelivered) {

            sql += build(
                `${checkMark}${checkMark}`,
                {
                    "target": "SPECIFIC UA REGISTERED TO SIM",
                    "uaSim": messageTowardGsm.uaSim,
                    alsoSendToUasWithMessageDisabled
                }
            );

            sql += build(
                `Me: ${Buffer.from(messageTowardGsm.textB64,"base64").toString("utf8")}`,
                {
                    "target": "ALL OTHER UA OF USER",
                    "uaSim": messageTowardGsm.uaSim,
                    alsoSendToUasWithMessageDisabled
                }
            );

            sql += build(
                `${messageTowardGsm.uaSim.ua.userEmail}: ${Buffer.from(messageTowardGsm.textB64,"base64").toString("utf8")}`,
                {
                    "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                    "uaSim": messageTowardGsm.uaSim,
                    alsoSendToUasWithMessageDisabled
                }
            );

        } else {

            sql += build(
                crossMark,
                {
                    "target": "SPECIFIC UA REGISTERED TO SIM",
                    "uaSim": messageTowardGsm.uaSim,
                    alsoSendToUasWithMessageDisabled
                }
            );

        }

        await _.query(sql);

    }


}

/** 
 * 
 * Only used to recover after being down to know from when 
 * we have to pull the SMS of chan-dongle-extended
 * 
 */
export async function lastMessageReceivedDateBySim(): Promise<{ [imsi: string]: Date }> {

    let rows = await _.query([
        "SELECT",
        "ua_sim.imsi,",
        "MAX(message_toward_sip.date) AS last_received",
        "FROM ua_sim",
        "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
        "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
        "WHERE (message_toward_sip.is_from_dongle=1 OR message_toward_sip.is_from_dongle IS NULL)",
        "GROUP BY imsi"
    ].join("\n"));

    let result: { [imsi: string]: Date } = {};

    for (let { imsi, last_received } of rows) {

        result[imsi] = new Date(last_received || 0);

    }

    return result;

}


/**
 * 
 * @param isFromDongle
 * Message toward SIP can be of two types:
 * txt       => true, SMS received via dongle.
 * signaling => false, notifications that are not actual SMS, (status report, missed calls, ect...)
 * 
 * @param fromNumber 
 * txt       => number of who sent the SMS
 * signaling => MessageTowardGsm.toNumber
 * 
 * @param text 
 * txt       => SMS
 * signaling => text to display on linphone clients
 * 
 * @param date 
 * txt       => date the SMS have been sent read from PDU
 * signaling => now
 * 
 * @param bundledData
 * data that will be smuggled in SIP headers 
 *
 * @param target 
 * targeted UAs
 * 
 */
function buildMessageTowardSipInsertQuery(
    isFromDongle: boolean,
    fromNumber: string,
    date: Date,
    bundledData: types.BundledData.ServerToClient,
    target: buildMessageTowardSipInsertQuery.Target
): string {

    let sqlSelectionUaSim = [
        "FROM ua_sim",
        "INNER JOIN ua ON ua.id_= ua_sim.ua",
        `WHERE ${target.alsoSendToUasWithMessageDisabled ? "" : `ua.messages_enabled= 1 AND `}ua_sim.imsi= `
    ].join("\n");

    switch (target.target) {
        case "SPECIFIC UA REGISTERED TO SIM":
            sqlSelectionUaSim += [
                _.esc(target.uaSim.imsi),
                `ua.instance= ${_.esc(target.uaSim.ua.instance)}`,
                `ua.user_email= ${_.esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
        case "ALL UA REGISTERED TO SIM":
            sqlSelectionUaSim += `${_.esc(target.imsi)}`;
            break;
        case "ALL UA OF USER":
            sqlSelectionUaSim += [
                _.esc(target.uaSim.imsi),
                `ua.user_email= ${_.esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
        case "ALL OTHER UA OF USER":
            sqlSelectionUaSim += [
                _.esc(target.uaSim.imsi),
                `ua.instance <> ${_.esc(target.uaSim.ua.instance)}`,
                `ua.user_email= ${_.esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
        case "ALL UA OF OTHER USERS REGISTERED TO SIM":
            sqlSelectionUaSim += [
                _.esc(target.uaSim.imsi),
                `ua.user_email<> ${_.esc(target.uaSim.ua.userEmail)}`
            ].join(" AND ");
            break;
    }

    const sql = [
        "INSERT INTO message_toward_sip ( is_from_dongle, bundled_data, date, from_number)",
        "SELECT",
        [
            sqliteCustom.bool.enc(isFromDongle),
            _.esc(JSON.stringify(bundledData)),
            _.esc(date.getTime()),
            _.esc(fromNumber)
        ].join(", "),
        sqlSelectionUaSim,
        "GROUP BY NULL",
        ";",
        _.buildSetVarQuery("message_toward_sip_id", "integer_value", "last_insert_rowid()"),
        "INSERT INTO ua_sim_message_toward_sip",
        "( ua_sim, message_toward_sip, delivered_date )",
        `SELECT ua_sim.id_, ${_.buildGetVarQuery("message_toward_sip_id")}, NULL`,
        sqlSelectionUaSim,
        ";",
        ""
    ].join("\n");

    return sql;

}


namespace buildMessageTowardSipInsertQuery {

    export type Target =
        ({
            target: "SPECIFIC UA REGISTERED TO SIM";
            uaSim: types.UaSim;
        } | {
            target: "ALL UA REGISTERED TO SIM";
            imsi: string;
        } | {
            target: "ALL UA OF USER";
            uaSim: types.UaSim;
        } | {
            target: "ALL OTHER UA OF USER";
            uaSim: types.UaSim;
        } | {
            target: "ALL UA OF OTHER USERS REGISTERED TO SIM";
            uaSim: types.UaSim;
        }) & { alsoSendToUasWithMessageDisabled: boolean; };

}


/**
 * 
 * TODO: include in tests
 * 
 * Notify specific ua that the phone it's trying to reach is ringing.
 * 
 * @param uaSim The uaSim that originated the call.
 * @param number The target phone number.
 * 
 * (For now it only send to web ua)
 * 
 * 
 */
export async function onTargetGsmRinging(
    contact: types.Contact,
    number: string,
    callId: string
): Promise<void> {

    if (contact.uaSim.ua.platform !== "web") {
        return;
    }

    const bundledData: types.BundledData.ServerToClient.Ringback = {
        "type": "RINGBACK",
        callId,
        "textB64": Buffer.from("( notify ringback )","utf8").toString("base64")
    };

    const sql = buildMessageTowardSipInsertQuery(
        false,
        number,
        new Date(),
        bundledData,
        {
            "target": "SPECIFIC UA REGISTERED TO SIM",
            "uaSim": contact.uaSim,
            "alsoSendToUasWithMessageDisabled": true
        }
    );

    await _.query(sql);

}

export async function onCallFromSipTerminated(
    number: string,
    imsi: string,
    callPlacedAtDateTime: number,
    callRingingAfterMs: number | undefined,
    callAnsweredAfterMs: number | undefined,
    callTerminatedAfterMs: number,
    ua: types.Ua
): Promise<void> {

    const buildQuery = (
        text: string,
        target: buildMessageTowardSipInsertQuery.Target
    ) => buildMessageTowardSipInsertQuery(
        false,
        number,
        new Date(callPlacedAtDateTime),
        (() => {

            const bundledData: types.BundledData.ServerToClient.FromSipCallSummary = {
                "type": "FROM SIP CALL SUMMARY",
                callPlacedAtDateTime,
                callRingingAfterMs,
                callAnsweredAfterMs,
                callTerminatedAfterMs,
                ua,
                "textB64": Buffer.from(
                    text,
                    "utf8"
                ).toString("base64")
            };

            return bundledData;

        })(),
        target
    );

    const alsoSendToUasWithMessageDisabled = false;

    const uaSim = { imsi, ua };

    const buildText = (email: string | undefined) => {

        const byText = email === undefined ? "" : `by ${email}`;

        if (callAnsweredAfterMs !== undefined) {

            const formatedCallDuration = (() => {

                const date = new Date(0);
                date.setMilliseconds(callTerminatedAfterMs - callAnsweredAfterMs)
                return date.toISOString().substr(11, 8);

            })();

            return `Call placed ${byText}, duration: ${formatedCallDuration}`;

        } else if (callRingingAfterMs !== undefined) {

            return `Call placed ${byText}, hanged up before being established.`;

        } else {

            return `Aborted attempt to place call ${byText}`;

        }

    };


    const sql = [
        buildQuery(
            buildText(undefined),
            {
                "target": "ALL UA OF USER",
                uaSim,
                alsoSendToUasWithMessageDisabled
            }
        ),
        buildQuery(
            buildText(ua.userEmail),
            {
                "target": "ALL UA OF OTHER USERS REGISTERED TO SIM",
                uaSim,
                alsoSendToUasWithMessageDisabled
            }
        )
    ].join("");

    await _.query(sql);

}