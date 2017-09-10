import * as runExclusive from "run-exclusive";
import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import * as md5 from "md5";

import * as f from "../tools/mySqlFunctions";
import { Contact } from "./sipContact";
import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_dbInterface");


export namespace asterisk {

    const groupRef = runExclusive.createGroupRef();

    let connection: mysql.IConnection | undefined = undefined;

    function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection) {

            connection = mysql.createConnection({
                ...c.dbParamsGateway,
                "database": "asterisk",
                "multipleStatements": true
            });

        }

        return f.queryOnConnection(connection, sql, values);

    }

    export const queryEndpoints = runExclusive.build(groupRef,
        async (): Promise<string[]> => {

            let endpoints = (await query("SELECT `id`,`set_var` FROM `ps_endpoints`")).map(({ id }) => id);

            return endpoints;

        }
    );

    export const truncateContacts = runExclusive.build(groupRef,
        async () => {

            await query("TRUNCATE ps_contacts");

        }
    );

    export const queryContacts = runExclusive.build(groupRef,
        async (): Promise<Contact[]> => {

            let contacts: Contact[] = await query(
                "SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM ps_contacts"
            );

            for (let contact of contacts) {
                contact.uri = contact.uri.replace(/\^3B/g, ";");
                contact.path = contact.path.replace(/\^3B/g, ";");
            }

            return contacts;

        }
    );

    //TODO: to test
    export const queryLastConnectionTimestampOfDonglesEndpoint = runExclusive.build(
        async (endpoint: string): Promise<number> => {

            let timestamp: number;

            try {

                let [{ set_var }] = await query(
                    "SELECT `set_var` FROM ps_endpoints WHERE `id`=?", [endpoint]
                );

                timestamp = parseInt(set_var.split("=")[1]);

            } catch (error) {

                timestamp = 0;

            }

            return timestamp;

        }
    )

    export const deleteContact = runExclusive.build(groupRef,
        async (contact: Contact): Promise<boolean> => {

            let { affectedRows } = await query(
                "DELETE FROM `ps_contacts` WHERE `id`=?", [contact.id]
            );

            let isDeleted = affectedRows ? true : false;

            return isDeleted;

        }
    );

    export const addOrUpdateEndpoint = runExclusive.build(groupRef,
        async (endpoint: string, password: string) => {

            debug(`Add or update endpoint ${endpoint} in real time configuration`);

            let sql = "";
            let values: (string | number | null)[] = [];

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_aors", {
                    "id": endpoint,
                    "max_contacts": 12,
                    "qualify_frequency": 0, //15000
                    "support_path": "yes"
                });

                sql += _sql;

                values = [...values, ..._values];

            })();

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_endpoints", {
                    "id": endpoint,
                    "disallow": "all",
                    "allow": "alaw,ulaw",
                    "context": c.sipCallContext,
                    "message_context": c.sipMessageContext,
                    "subscribe_context": null,
                    "aors": endpoint,
                    "auth": endpoint,
                    "force_rport": null,
                    "from_domain": c.shared.backendHostname,
                    "ice_support": "yes",
                    "direct_media": null,
                    "asymmetric_rtp_codec": null,
                    "rtcp_mux": null,
                    "direct_media_method": null,
                    "connected_line_method": null,
                    "transport": "transport-tcp",
                    "callerid_tag": null,
                    "set_var": `LAST_CONNECTION_TIMESTAMP=${Date.now()}`
                });

                sql += _sql;

                values = [...values, ..._values];

            })();

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_auths", {
                    "id": endpoint,
                    "auth_type": "userpass",
                    "username": endpoint,
                    "password": password,
                    "realm": "semasim"
                });

                sql += _sql;

                values = [...values, ..._values];

            })();

            await query(sql, values);

        }
    );


}

export namespace semasim {

    const groupRef = runExclusive.createGroupRef();

    let connection: mysql.IConnection | undefined = undefined;

    function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection) {

            connection = mysql.createConnection({
                ...c.dbParamsGateway,
                "multipleStatements": true
            });

        }

        return f.queryOnConnection(connection, sql, values);

    }

    export type UaInstancePk = {
        dongle_imei: string;
        instance_id: string;
    }

    export type TargetUaInstances = {
        allUaInstanceOfImei?: string;
        uaInstance?: UaInstancePk;
        allUaInstanceOfEndpointOtherThan?: UaInstancePk;
    };

    export type MessageTowardGsmPk = {
        sim_iccid: string;
        creation_timestamp: number;
    };


    export const addMessageTowardGsm = runExclusive.build(groupRef,
        async (to_number: string, text: string, sender: UaInstancePk): Promise<MessageTowardGsmPk> => {

            let [{ sim_iccid }] = await query(
                [
                    "SELECT dongle.`sim_iccid`",
                    "FROM dongle",
                    "INNER JOIN sim ON sim.`iccid`= dongle.`sim_iccid`",
                    "WHERE dongle.`imei`=?"
                ].join("\n"),
                [sender.dongle_imei]
            );

            let [{ ua_instance_id }] = await query(
                "SELECT `id` AS `ua_instance_id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id`=?",
                [sender.dongle_imei, sender.instance_id]
            );

            let creation_timestamp = Date.now();

            let [sql, values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                sim_iccid,
                creation_timestamp,
                ua_instance_id,
                to_number,
                "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                "sent_message_id": null
            });

            await query(sql, values);

            return { sim_iccid, creation_timestamp };

        }
    );

    export const setMessageToGsmSentId = runExclusive.build(groupRef,
        async ({ sim_iccid, creation_timestamp }: MessageTowardGsmPk, sent_message_id: number | null) => {

            let [sql, values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                sim_iccid, creation_timestamp, sent_message_id
            });

            await query(sql, values);
        }
    );

    export const getUnsentMessageOfDongleSim = runExclusive.build(groupRef,
        async (imei: string): Promise<{ pk: MessageTowardGsmPk; sender: UaInstancePk; to_number: string; text: string }[]> => {

            return (await query(
                [
                    "SELECT",
                    "message_toward_gsm.`sim_iccid`,",
                    "message_toward_gsm.`creation_timestamp`,",
                    "message_toward_gsm.`to_number`,",
                    "message_toward_gsm.`base64_text`,",
                    "ua_instance.`dongle_imei`,",
                    "ua_instance.`instance_id`",
                    "FROM message_toward_gsm",
                    "INNER JOIN sim ON sim.`iccid`= message_toward_gsm.`sim_iccid`",
                    "INNER JOIN dongle ON dongle.`sim_iccid`= sim.`iccid`",
                    "INNER JOIN ua_instance ON ua_instance.`id` = message_toward_gsm.`ua_instance_id`",
                    "WHERE dongle.`imei`= ? AND message_toward_gsm.`sent_message_id` IS NULL",
                    "ORDER BY message_toward_gsm.`creation_timestamp`"
                ].join("\n"),
                [imei]
            )).map(
                ({
                    sim_iccid,
                    creation_timestamp,
                    dongle_imei,
                    instance_id,
                    base64_text,
                    ...rest
                }) => ({
                        "pk": { sim_iccid, creation_timestamp },
                        "sender": { dongle_imei, instance_id },
                        "text": (new Buffer(base64_text, "base64")).toString("utf8"),
                        ...rest
                    })
                );


        }
    );


    export const getSenderAndTextOfSentMessageToGsm = runExclusive.build(groupRef,
        async (imei: string, sent_message_id: number): Promise<{ sender: UaInstancePk; text: string } | undefined> => {

            return (await query(
                [
                    "SELECT",
                    "ua_instance.`dongle_imei`,",
                    "ua_instance.`instance_id`,",
                    "message_toward_gsm.`base64_text`",
                    "FROM message_toward_gsm",
                    "INNER JOIN sim ON sim.`iccid`= message_toward_gsm.`sim_iccid`",
                    "INNER JOIN dongle ON dongle.`sim_iccid`= sim.`iccid`",
                    "INNER JOIN ua_instance ON ua_instance.`id` = message_toward_gsm.`ua_instance_id`",
                    "WHERE dongle.`imei`= ? AND message_toward_gsm.`sent_message_id`= ?",
                ].join("\n"),
                [imei, sent_message_id]
            ))
                .map(
                ({ dongle_imei, instance_id, base64_text }) => ({
                    "sender": { dongle_imei, instance_id },
                    "text": (new Buffer(base64_text, "base64")).toString("utf8")
                })
                )
                .pop();


        }
    );


    export const addDongleAndSim = runExclusive.build(groupRef,
        async (imei: string, iccid: string) => {

            let sql = "";
            let values: (string | number | null)[] = [];

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("sim", { iccid });

                sql += _sql;

                values = [...values, ..._values];

            })();

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("dongle", {
                    imei, "sim_iccid": iccid
                });

                sql += _sql;

                values = [...values, ..._values];

            })();


            await query(sql, values);

        }
    );


    export const addUaInstance = runExclusive.build(groupRef,
        async ({ dongle_imei, instance_id }: UaInstancePk): Promise<boolean> => {

            let [sql, values] = f.buildInsertOrUpdateQuery("ua_instance", { dongle_imei, instance_id });

            let resp = await query(sql, values);

            let isNew = resp.insertId !== 0;

            return isNew;


        }
    );


    export const addMessageTowardSip = runExclusive.build(groupRef,
        async (from_number: string, text: string, date: Date, target: TargetUaInstances) => {

            let ua_instance_ids: number[];
            let imei: string;

            if (target.allUaInstanceOfImei) {

                imei = target.allUaInstanceOfImei;

                ua_instance_ids = (await query(
                    "SELECT `id` FROM ua_instance WHERE `dongle_imei`=?",
                    [imei]
                )).map(({ id }) => id);


            } else if (target.allUaInstanceOfEndpointOtherThan) {

                let { dongle_imei, instance_id } = target.allUaInstanceOfEndpointOtherThan;
                imei = dongle_imei;

                ua_instance_ids = (await query(
                    "SELECT `id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id` <> ?",
                    [imei, instance_id]
                )).map(({ id }) => id);

                if (!ua_instance_ids.length) return;

            } else if (target.uaInstance) {

                let { dongle_imei, instance_id } = target.uaInstance;
                imei = dongle_imei;

                let [{ id }] = (await query(
                    "SELECT `id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id`= ?",
                    [imei, instance_id]
                ));

                ua_instance_ids = [id];

            } else throw new Error("No target");

            let [{ sim_iccid }] = await query("SELECT `sim_iccid` FROM dongle WHERE `imei`=?", [imei]);

            let creation_timestamp = date.getTime();

            let sql_values = f.buildInsertOrUpdateQuery("message_toward_sip", {
                sim_iccid,
                creation_timestamp,
                from_number,
                "base64_text": (new Buffer(text, "utf8")).toString("base64")
            });

            let { insertId } = await query(sql_values[0], sql_values[1]);

            let message_toward_sip_id: number = insertId;

            let sql = "";
            let values: (string | number | null)[] = [];

            for (let ua_instance_id of ua_instance_ids) {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                    ua_instance_id,
                    message_toward_sip_id,
                    "delivered_timestamp": null
                });

                sql += _sql;
                values = [...values, ..._values];

            }

            await query(sql, values);

        }
    );

    export const setMessageTowardSipDelivered = runExclusive.build(groupRef,
        async ({ dongle_imei, instance_id }: UaInstancePk, message_toward_sip_creation_timestamp: number) => {

            let [{ ua_instance_id }] = await query(
                "SELECT `id` AS `ua_instance_id` FROM ua_instance WHERE `dongle_imei` = ? AND `instance_id` = ?",
                [dongle_imei, instance_id]
            );

            let [{ message_toward_sip_id }] = await query(
                [
                    "SELECT message_toward_sip.`id` AS `message_toward_sip_id`",
                    "FROM message_toward_sip",
                    "INNER JOIN sim ON sim.`iccid` = message_toward_sip.`sim_iccid`",
                    "INNER JOIN dongle ON dongle.`sim_iccid` = sim.`iccid`",
                    "WHERE message_toward_sip.`creation_timestamp` = ? AND dongle.`imei` = ?"
                ].join("\n"),
                [message_toward_sip_creation_timestamp, dongle_imei]
            );

            let [sql, values] = f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                ua_instance_id,
                message_toward_sip_id,
                "delivered_timestamp": Date.now()
            });

            await query(sql, values);

        }
    );


    export const getUndeliveredMessagesOfUaInstance = runExclusive.build(groupRef,
        async ({ dongle_imei, instance_id }: UaInstancePk): Promise<{ creation_timestamp: number; from_number: string; text: string }[]> => {

            return (await query(
                [
                    "SELECT message_toward_sip.`creation_timestamp`, message_toward_sip.`from_number`, message_toward_sip.`base64_text`",
                    "FROM message_toward_sip",
                    "INNER JOIN sim",
                    "ON sim.`iccid` = message_toward_sip.`sim_iccid`",
                    "INNER JOIN dongle",
                    "ON dongle.`sim_iccid` = sim.`iccid`",
                    "INNER JOIN ua_instance",
                    "ON ua_instance.`dongle_imei` = dongle.`imei`",
                    "INNER JOIN ua_instance_message_toward_sip",
                    "ON  ua_instance_message_toward_sip.`ua_instance_id` = ua_instance.`id`",
                    "AND ua_instance_message_toward_sip.`message_toward_sip_id` = message_toward_sip.`id`",
                    "WHERE dongle.`imei` = ? AND ua_instance.`instance_id` = ? AND ua_instance_message_toward_sip.`delivered_timestamp` IS NULL",
                    "ORDER BY message_toward_sip.`creation_timestamp`"
                ].join("\n"),
                [dongle_imei, instance_id]
            )).map(
                ({ base64_text, ...rest }) => ({ ...rest, "text": (new Buffer(base64_text, "base64")).toString("utf8") })
                );

        }
    );

}

