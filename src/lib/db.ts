import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import { PsContact, Contact } from "./sipContact";

import * as f from "../tools/mySqlFunctions";
import { MySqlEvents } from "../tools/MySqlEvents";
import { c } from "./_constants"
import { DongleController as Dc } from "chan-dongle-extended-client";

export namespace asterisk {

    const connectionConfig: mysql.IConnectionConfig = {
        ...c.dbParamsGateway,
        "database": "asterisk"
    };

    /** is exported only for tests */
    export const { query, esc, buildInsertQuery }=f.getUtils(connectionConfig);

    /** for test purpose only */
    export async function flush() {

        let sql = [
            "DELETE FROM ps_aors;",
            "DELETE FROM ps_auths;",
            "DELETE FROM ps_contacts;",
            "DELETE FROM ps_endpoints;",
        ].join("\n");

        await query(sql);

    }

    export const evtNewContact = new SyncEvent<Contact>();

    export const evtExpiredContact = new SyncEvent<Contact>();

    export async function startListeningPsContacts(): Promise<void> {

        await query([
            "DELETE FROM ps_contacts",
            "WHERE endpoint LIKE '_______________'"
        ].join("\n"));

        await MySqlEvents.initialize(connectionConfig);

        MySqlEvents.instance.evtNewRow.attach(
            ({ database, table }) => (
                database === connectionConfig.database &&
                table === "ps_contacts"
            ),
            async ({ row }) => {

                let { id, endpoint, path, uri, user_agent } = row;

                let psContact: PsContact = { id, endpoint, path, uri, user_agent };

                let contact = PsContact.buildContact(psContact);

                evtNewContact.post(contact);

            }
        );

        MySqlEvents.instance.evtDeleteRow.attach(
            ({ database, table }) => (
                database === connectionConfig.database &&
                table === "ps_contacts"
            ),
            async ({ row }) => {

                let { id, endpoint, path, uri, user_agent } = row;

                let psContact: PsContact = { id, endpoint, path, uri, user_agent };

                let contact = PsContact.buildContact(psContact);

                evtExpiredContact.post(contact);

            }
        );

    }

    export function deleteContact(contact: Contact) {
        return new Promise<boolean>((resolve, reject) => {

            //TODO: this crash some times for some reasons
            let timerId = setTimeout(
                () => reject(new Error(`Delete contact timeout error`)),
                3000
            );

            let queryPromise = (async () => {

                let { affectedRows } = await query(
                    `DELETE FROM ps_contacts WHERE id=${esc(contact.id)}`
                );

                let isDeleted = affectedRows ? true : false;

                if (!isDeleted) {
                    evtExpiredContact.detach(timerId);
                    clearTimeout(timerId);
                    resolve(false);
                }

            })();

            evtExpiredContact.attachOnceExtract(
                ({ id }) => id === contact.id,
                timerId,
                deletedContact => queryPromise.then(() => {
                    clearTimeout(timerId);
                    resolve(true);
                })
            );

        });
    }

    export async function createEndpointIfNeededAndGetPassword(
        imsi: string,
        renewPassword: "RENEW PASSWORD" | undefined = undefined
    ): Promise<string> {

        let sql = "";

        sql += buildInsertQuery("ps_aors", {
            "id": imsi,
            "max_contacts": 12,
            "qualify_frequency": 0, //15000
            "support_path": "yes"
        }, "IGNORE");

        sql += [
            "INSERT INTO ps_auths ( id, auth_type, username, password, realm )",
            `VALUES( ${esc(imsi)}, 'userpass', ${esc(imsi)}, MD5(RAND()), 'semasim' )`,
            "ON DUPLICATE KEY UPDATE",
            renewPassword ? "password= VALUES(password)" : "id=id",
            ";",
            ""
        ].join("\n");

        sql += buildInsertQuery("ps_endpoints", {
            "id": imsi,
            "disallow": "all",
            "allow": "alaw,ulaw",
            "context": c.sipCallContext,
            "message_context": c.sipMessageContext,
            "subscribe_context": null,
            "aors": imsi,
            "auth": imsi,
            "force_rport": null,
            "from_domain": c.shared.domain,
            "ice_support": "yes",
            "direct_media": null,
            "asymmetric_rtp_codec": null,
            "rtcp_mux": null,
            "direct_media_method": null,
            "connected_line_method": null,
            "transport": "transport-tcp",
            "callerid_tag": null
        }, "IGNORE");

        sql += `SELECT password FROM ps_auths WHERE id= ${esc(imsi)}`;

        let { password } = (await query(sql)).pop()[0];

        return password;

    }

}

export namespace semasim {

    export const { query, esc, buildInsertQuery }= f.getUtils({
        ...c.dbParamsGateway,
        "database": "semasim"
    }, "HANDLE STRING ENCODING");

    /** Only for test purpose */
    export async function flush() {

        let sql = [
            "DELETE FROM ua;",
            "DELETE FROM message_toward_sip;"
        ].join("\n");

        await query(sql);

    }

    export async function addUaSim(
        uaSim: Contact.UaSim
    ): Promise<{
        isUaCreatedOrUpdated: boolean;
        isFirstUaForSim: boolean;
    }> {

        let sql = "";

        let { imsi, ua } = uaSim;

        sql += buildInsertQuery("ua", {
            "instance": ua.instance,
            "user_email": ua.userEmail,
            "platform": ua.platform,
            "push_token": ua.pushToken,
            "software": ua.software
        }, "UPDATE");

        sql += [
            "SELECT @ua_ref:=ua.id_",
            "FROM ua",
            `WHERE instance= ${esc(ua.instance)} AND user_email= ${esc(ua.userEmail)}`,
            ";",
            ""
        ].join("\n");

        sql += buildInsertQuery("ua_sim", {
            "ua": { "@": "ua_ref" },
            imsi
        }, "IGNORE");

        sql += [
            `SELECT COUNT(*) as sim_ua_count`,
            "FROM ua_sim",
            `WHERE imsi= ${esc(imsi)}`
        ].join("\n");

        let queryResults = await query(sql);

        return {
            "isUaCreatedOrUpdated": queryResults[0].insertId !== 0,
            "isFirstUaForSim": (
                queryResults[2].insertId !== 0 && 
                queryResults[3][0]["sim_ua_count"] === 1
            )
        };

    }

    //TODO: test!
    export async function removeUaSim(
        imsi: string,
        uasToKeep: Contact.UaSim.Ua[]= []
    ) {

        let cond = uasToKeep.length ? [
            " AND NOT ( ",
            uasToKeep.map(
                ua => `ua.instance= ${esc(ua.instance)} AND ua.user_email= ${esc(ua.userEmail)}`
            ).join(" OR "),
            " )"
        ].join("") : "";

        await query([
            "DELETE ua_sim.*",
            "FROM ua_sim",
            "INNER JOIN ua ON ua.id_= ua_sim.ua",
            `WHERE ua_sim.imsi= ${esc(imsi)}${cond}`
        ].join("\n"));
    }


    export interface MessageTowardGsm {
        date: Date;
        uaSim: Contact.UaSim;
        toNumber: string;
        text: string;
    };

    export namespace MessageTowardGsm {

        export async function add(
            toNumber: string,
            text: string,
            uaSim: Contact.UaSim
        ): Promise<void> {

            let sql = "";

            sql += [
                "SELECT @ua_sim_ref:= ua_sim.id_",
                "FROM ua_sim",
                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                "WHERE",
                [
                    `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                    `ua.instance = ${esc(uaSim.ua.instance)}`,
                    `ua.user_email= ${esc(uaSim.ua.userEmail)}`
                ].join(" AND "),
                ";",
                ""
            ].join("\n");

            sql += buildInsertQuery("message_toward_gsm", {
                "date": Date.now(),
                "ua_sim": { "@": "ua_sim_ref" },
                "to_number": toNumber,
                "text": text,
                "send_date": null
            }, "THROW ERROR");

            await query(sql);

        }

        export type Confirm = {
            setSent(sentDate: Date | null): Promise<void>;
            setStatusReport(statusReport: Dc.StatusReport): Promise<void>
        };

        export async function getUnsent(
            imsi: string
        ): Promise<[MessageTowardGsm, Confirm][]> {

            let rows = await query(
                [
                    "SELECT",
                    "message_toward_gsm.id_,",
                    "message_toward_gsm.date,",
                    "message_toward_gsm.to_number,",
                    "message_toward_gsm.text,",
                    "ua_sim.imsi,",
                    "ua.instance,",
                    "ua.user_email,",
                    "ua.platform,",
                    "ua.push_token,",
                    "ua.software",
                    "FROM message_toward_gsm",
                    "INNER JOIN ua_sim ON ua_sim.id_ = message_toward_gsm.ua_sim",
                    "INNER JOIN ua ON ua.id_ = ua_sim.ua",
                    `WHERE ua_sim.imsi=${esc(imsi)} AND message_toward_gsm.send_date IS NULL`,
                    "ORDER BY message_toward_gsm.date",
                    ";"
                ].join("\n")
            );

            let out: [MessageTowardGsm, Confirm][] = [];

            for (let row of rows) {

                let message: MessageTowardGsm = {
                    "date": new Date(row["date"]),
                    "uaSim": {
                        "ua": {
                            "instance": row["instance"],
                            "userEmail": row["user_email"],
                            "platform": row["platform"],
                            "pushToken": row["push_token"],
                            "software": row["software"]
                        },
                        "imsi": row["imsi"]
                    },
                    "toNumber": row["to_number"],
                    "text": row["text"]
                };

                let message_toward_gsm_id_ = row["id_"];

                let confirm: Confirm = {
                    "setSent": async sentDate => await query(
                        buildInsertQuery("message_toward_gsm", {
                            "id_": message_toward_gsm_id_,
                            "send_date": sentDate ? sentDate.getTime() : -1
                        }, "UPDATE")
                    ),
                    "setStatusReport": async statusReport => await query(
                        buildInsertQuery("message_toward_gsm_status_report", {
                            "message_toward_gsm": message_toward_gsm_id_,
                            "is_delivered": statusReport.isDelivered ? 1 : 0,
                            "discharge_date": isNaN(statusReport.dischargeDate.getTime()) ?
                                null : statusReport.dischargeDate.getTime(),
                            "status": statusReport.status
                        }, "UPDATE")
                    )
                };

                out.push([message, confirm]);

            }

            return out;

        }

    }

    export async function lastMessageReceivedDateBySim(): Promise<{ [imsi: string]: Date }> {

        let rows = await query([
            "SELECT",
            "ua_sim.imsi,",
            "MAX(message_toward_sip.date) AS last_received",
            "FROM ua_sim",
            "LEFT JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.ua_sim = ua_sim.id_",
            "LEFT JOIN message_toward_sip ON message_toward_sip.id_ = ua_sim_message_toward_sip.message_toward_sip",
            "WHERE (message_toward_sip.is_report=0 OR message_toward_sip.is_report IS NULL)",
            "GROUP BY imsi"
        ].join("\n"));

        let result: { [imsi: string]: Date } = {};

        for (let { imsi, last_received } of rows) {

            result[imsi] = new Date(last_received || 0);

        }

        return result;

    }

    export interface MessageTowardSip {
        isReport: boolean;
        date: Date;
        fromNumber: string;
        text: string;
    }

    export namespace MessageTowardSip {

        export type Target =
            {
                target: "SPECIFIC UA REGISTERED TO SIM";
                uaSim: Contact.UaSim;
            } | {
                target: "ALL UA REGISTERED TO SIM";
                imsi: string;
            } | {
                target: "ALL OTHER UA OF USER REGISTERED TO SIM";
                uaSim: Contact.UaSim;
            } | {
                target: "ALL UA OF OTHER USERS REGISTERED TO SIM";
                uaSim: Contact.UaSim;
            };

        /** return true if message_toward_sip added */
        export async function add(
            fromNumber: string,
            text: string,
            date: Date,
            isReport: boolean,
            target: Target
        ): Promise<boolean> {

            let sqlSelectionUaSim = [
                "FROM ua_sim",
                "INNER JOIN ua ON ua.id_= ua_sim.ua",
                "WHERE ua_sim.imsi= "
            ].join("\n");

            switch (target.target) {
                case "SPECIFIC UA REGISTERED TO SIM":
                    sqlSelectionUaSim += [
                        `${esc(target.uaSim.imsi)}`,
                        `ua.instance= ${esc(target.uaSim.ua.instance)}`,
                        `ua.user_email= ${esc(target.uaSim.ua.userEmail)}`
                    ].join(" AND ");
                    break;
                case "ALL UA REGISTERED TO SIM":
                    sqlSelectionUaSim += `${esc(target.imsi)}`;
                    break;
                case "ALL OTHER UA OF USER REGISTERED TO SIM":
                    sqlSelectionUaSim += [
                        `${esc(target.uaSim.imsi)}`,
                        `ua.instance <> ${esc(target.uaSim.ua.instance)}`,
                        `ua.user_email= ${esc(target.uaSim.ua.userEmail)}`
                    ].join(" AND ");
                    break;
                case "ALL UA OF OTHER USERS REGISTERED TO SIM":
                    sqlSelectionUaSim += [
                        `${esc(target.uaSim.imsi)}`,
                        `ua.user_email<> ${esc(target.uaSim.ua.userEmail)}`
                    ].join(" AND ");
                    break;
            }

            let queryResults= await query([
                "INSERT INTO message_toward_sip ( is_report, date, from_number, text )",
                "SELECT",
                [
                    esc(isReport ? 1 : 0),
                    esc(date.getTime()),
                    esc(fromNumber),
                    esc(text)
                ].join(", "),
                sqlSelectionUaSim,
                "HAVING COUNT(*) <> 0",
                ";",
                "INSERT INTO ua_sim_message_toward_sip",
                "( ua_sim, message_toward_sip, delivered_date )",
                "SELECT ua_sim.id_, LAST_INSERT_ID(), NULL",
                sqlSelectionUaSim
            ].join("\n"));

            return queryResults[0].insertId !== 0;

        }

        export async function unsentCount(
            uaSim: Contact.UaSim
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
                    `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                    `ua.instance= ${esc(uaSim.ua.instance)}`,
                    `ua.user_email= ${esc(uaSim.ua.userEmail)}`
                ].join(" AND ")
            ].join("\n");

            return (await query(sql))[0]["count"];

        }

        /** Return array of [ MessageTowardSip, setDelivered ] */
        export async function getUnsent(
            uaSim: Contact.UaSim
        ) {

            let sql = [
                `SELECT`,
                `message_toward_sip.is_report,`,
                `message_toward_sip.date,`,
                `message_toward_sip.from_number,`,
                `message_toward_sip.text,`,
                `ua_sim_message_toward_sip.id_`,
                `FROM message_toward_sip`,
                `INNER JOIN ua_sim_message_toward_sip ON ua_sim_message_toward_sip.message_toward_sip= message_toward_sip.id_`,
                `INNER JOIN ua_sim ON ua_sim.id_= ua_sim_message_toward_sip.ua_sim`,
                `INNER JOIN ua ON ua.id_= ua_sim.ua`,
                "WHERE",
                [
                    "ua_sim_message_toward_sip.delivered_date IS NULL",
                    `ua_sim.imsi= ${esc(uaSim.imsi)}`,
                    `ua.instance= ${esc(uaSim.ua.instance)}`,
                    `ua.user_email= ${esc(uaSim.ua.userEmail)}`
                ].join(" AND "),
                `ORDER BY message_toward_sip.date`
            ].join("\n");

            let rows = await query(sql);

            let out = new Array<[MessageTowardSip, () => Promise<void>]>();

            for (let row of rows) {

                let message: MessageTowardSip = {
                    "date": new Date(row["date"]),
                    "fromNumber": row["from_number"],
                    "isReport": row["is_report"] === 1,
                    "text": row["text"]
                };

                let setReceived = async () => await query(
                    buildInsertQuery("ua_sim_message_toward_sip", {
                        "id_": row["id_"],
                        "delivered_date": Date.now()
                    }, "UPDATE")
                );

                out.push([message, setReceived]);

            }

            return out;

        }

    }

}
