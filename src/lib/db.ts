import * as runExclusive from "run-exclusive";
import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import * as md5 from "md5";

import * as f from "../tools/mySqlFunctions";
import { Contact } from "./sipContact";
import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_dbInterface");

//TODO: manage transactions with async-lock rather than with runExclusive
//do it here but more importantly on backend

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

    export async function queryEndpoints(): Promise<string[]> {

        let endpoints = (await query("SELECT `id`,`set_var` FROM `ps_endpoints`")).map(({ id }) => id);

        return endpoints;
    }

    export async function truncateContacts() {

            await query("TRUNCATE ps_contacts");

    }

    export async function queryContacts(): Promise<Contact[]> {

            let contacts: Contact[] = await query(
                "SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM ps_contacts"
        );

        for (let contact of contacts) {
            contact.uri = contact.uri.replace(/\^3B/g, ";");
            contact.path = contact.path.replace(/\^3B/g, ";");
        }

        return contacts;

    }

    //TODO: to test
    export async function queryLastConnectionTimestampOfDonglesEndpoint(
        endpoint: string
    ): Promise<number> {

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


    export async function deleteContact(contact: Contact): Promise<boolean> {

        let { affectedRows } = await query(
            "DELETE FROM `ps_contacts` WHERE `id`=?", [contact.id]
        );

        let isDeleted = affectedRows ? true : false;

        return isDeleted;

    }

    export async function addOrUpdateEndpoint(
        endpoint: string,
        password: string
    ) {

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
                "from_domain": c.shared.domain,
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


    export type TargetUaInstances ={
        allUaInstanceOfImei?: string; 
        uaInstance?: UaInstancePk; 
        allUaInstanceOfEndpointOtherThan?: UaInstancePk; 
    };

    export type MessageTowardGsm = {
        id: number;
        sim_iccid: string;
        date: Date;
        sender: UaInstancePk;
        to_number: string;
        text: string;
    }

    export type MessageTowardSip= {
        id: number;
        date: Date;
        from_number: string;
        text: string;
    }

    export const addMessageTowardGsm = runExclusive.build(groupRef,
        async (to_number: string, text: string, sender: UaInstancePk): Promise<number> => {

            let sql = "";
            let values: (string | number | null)[] = [];

            let sim_iccid_ref = "A";

            sql += [
                `SELECT @${sim_iccid_ref}:=dongle.sim_iccid`,
                "FROM dongle",
                "INNER JOIN sim ON sim.iccid= dongle.sim_iccid",
                `WHERE dongle.imei= ? `,
                ";"
            ].join("\n");


            values = [...values, sender.dongle_imei];

            let ua_instance_id_ref = "B";

            sql += "\n" + [
                `SELECT @${ua_instance_id_ref}:=id`,
                "FROM ua_instance",
                `WHERE dongle_imei=? AND instance_id=?`,
                ";"
            ].join("\n");

            values = [...values, sender.dongle_imei, sender.instance_id];

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                    "sim_iccid": { "@": sim_iccid_ref },
                    "date": Date.now(),
                    "ua_instance_id": { "@": ua_instance_id_ref },
                    to_number,
                    "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                    "sent_message_id": null
                });

                sql += "\n" + _sql;

                values = [...values, ..._values];

            })();

            let { insertId } = (await query(sql, values)).pop();

            let message_toward_gsm_id: number = insertId;

            return message_toward_gsm_id;

        }
    );

    export const setMessageToGsmSentId = runExclusive.build(groupRef,
        async (message_toward_gsm_id: number, sent_message_id: number) => {

            let [sql, values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                "id": message_toward_gsm_id,
                sent_message_id
            });

            await query(sql, values);
        }
    );

    export const getUnsentMessageOfDongleSim = runExclusive.build(groupRef,
        async (imei: string): Promise<MessageTowardGsm[]> => {

            let queryResult = await query(
                [
                    "SELECT",
                    "message_toward_gsm.id,",
                    "message_toward_gsm.sim_iccid,",
                    "message_toward_gsm.date,",
                    "message_toward_gsm.to_number,",
                    "message_toward_gsm.base64_text,",
                    "ua_instance.instance_id",
                    "FROM message_toward_gsm",
                    "INNER JOIN sim ON sim.iccid= message_toward_gsm.sim_iccid",
                    "INNER JOIN dongle ON dongle.sim_iccid= sim.iccid",
                    "INNER JOIN ua_instance ON ua_instance.id = message_toward_gsm.ua_instance_id",
                    "WHERE dongle.imei= ? AND message_toward_gsm.sent_message_id IS NULL",
                    "ORDER BY message_toward_gsm.date"
                ].join("\n"),
                [imei]
            );

            let messages: MessageTowardGsm[] = [];

            for (let line of queryResult) {

                let message: MessageTowardGsm = {
                    "id": line.id,
                    "sim_iccid": line.sim_iccid,
                    "date": new Date(line.date),
                    "sender": {
                        "dongle_imei": imei,
                        "instance_id": line.instance_id
                    },
                    "to_number": line.to_number,
                    "text": (new Buffer(line.base64_text, "base64")).toString("utf8")
                };

                messages.push(message);

            }

            return messages;


        }
    );

    export const getSenderAndTextOfSentMessageToGsm = runExclusive.build(groupRef,
        async (imei: string, sent_message_id: number): Promise<{ sender: UaInstancePk; text: string } | undefined> => {

            let query_result = await query(
                [
                    "SELECT",
                    "ua_instance.instance_id,",
                    "message_toward_gsm.base64_text",
                    "FROM message_toward_gsm",
                    "INNER JOIN sim ON sim.iccid= message_toward_gsm.sim_iccid",
                    "INNER JOIN dongle ON dongle.sim_iccid= sim.iccid",
                    "INNER JOIN ua_instance ON ua_instance.id = message_toward_gsm.ua_instance_id",
                    "WHERE dongle.imei= ? AND message_toward_gsm.sent_message_id= ?",
                ].join("\n"),
                [imei, sent_message_id]
            );

            if( !query_result.length ) return undefined;

            let [{ instance_id, base64_text }]= query_result;

            return {
                "sender": { "dongle_imei": imei, instance_id },
                "text": (new Buffer(base64_text, "base64")).toString("utf8")
            };

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
        async (uaInstancePk: UaInstancePk): Promise<boolean> => {

            let { dongle_imei, instance_id } = uaInstancePk;

            let [sql, values] = f.buildInsertOrUpdateQuery("ua_instance", { dongle_imei, instance_id });

            let resp = await query(sql, values);

            let isNew = resp.insertId !== 0;

            return isNew;


        }
    );

    export const addMessageTowardSip = runExclusive.build(groupRef,
        async (from_number: string, text: string, date: Date, target: TargetUaInstances): Promise<number> => {

            let ua_instance_ids: number[];
            let imei: string;

            if (target.allUaInstanceOfImei) {

                imei = target.allUaInstanceOfImei;

                ua_instance_ids = (await query(
                    "SELECT id FROM ua_instance WHERE dongle_imei=?",
                    [imei]
                )).map(({ id }) => id);

            } else if (target.allUaInstanceOfEndpointOtherThan) {

                let { dongle_imei, instance_id } = target.allUaInstanceOfEndpointOtherThan;
                imei = dongle_imei;

                ua_instance_ids = (await query(
                    "SELECT id FROM ua_instance WHERE dongle_imei=? AND instance_id <> ?",
                    [imei, instance_id]
                )).map(({ id }) => id);

                if (!ua_instance_ids.length) return NaN;

            } else if (target.uaInstance) {

                let { dongle_imei, instance_id } = target.uaInstance;
                imei = dongle_imei;

                let [{ id }] = (await query(
                    "SELECT id FROM ua_instance WHERE dongle_imei=? AND instance_id= ?",
                    [imei, instance_id]
                ));

                ua_instance_ids = [id];

            } else throw new Error("No target");

            let [{ sim_iccid }] = await query("SELECT sim_iccid FROM dongle WHERE imei=?", [imei]);

            let message_toward_sip_id: number;


            let [_sql, _values] = f.buildInsertOrUpdateQuery("message_toward_sip", {
                sim_iccid,
                "date": date.getTime(),
                from_number,
                "base64_text": (new Buffer(text, "utf8")).toString("base64")
            });

            let { insertId } = await query(_sql, _values);

            message_toward_sip_id = insertId;

            let sql = "";
            let values: (string | number | null)[] = [];

            for (let ua_instance_id of ua_instance_ids) {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                    ua_instance_id,
                    message_toward_sip_id,
                    "delivered_date": null
                });

                sql += _sql;
                values = [...values, ..._values];

            }

            await query(sql, values);

            return message_toward_sip_id;

        }
    );

    export const setMessageTowardSipDelivered = runExclusive.build(groupRef,
        async ( uaInstancePk: UaInstancePk, message_toward_sip_id: number) => {

            let { dongle_imei, instance_id } = uaInstancePk;

            let sql = "";
            let values: (string | number | null)[] = [];

            let ua_instance_id_ref = "A";

            sql += `SELECT @${ua_instance_id_ref}:=id FROM ua_instance WHERE dongle_imei = ? AND instance_id = ?;`;

            values = [...values, dongle_imei, instance_id];

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("ua_instance_message_toward_sip", {
                    "ua_instance_id": { "@": ua_instance_id_ref },
                    message_toward_sip_id,
                    "delivered_date": Date.now()
                });

                sql += "\n" + _sql;

                values = [...values, ..._values];

            })();

            await query(sql, values);

        }
    );

    export const getUndeliveredMessagesOfUaInstance = runExclusive.build(groupRef,
        async (uaInstancePk: UaInstancePk): Promise<MessageTowardSip[]> => {

            let { dongle_imei, instance_id }= uaInstancePk;

            let queryResult= await query(
                [
                    "SELECT message_toward_sip.id,",
                    "message_toward_sip.date,",
                    "message_toward_sip.from_number,",
                    "message_toward_sip.base64_text",
                    "FROM message_toward_sip",
                    "INNER JOIN sim",
                    "ON sim.iccid = message_toward_sip.sim_iccid",
                    "INNER JOIN dongle",
                    "ON dongle.sim_iccid = sim.iccid",
                    "INNER JOIN ua_instance",
                    "ON ua_instance.dongle_imei = dongle.imei",
                    "INNER JOIN ua_instance_message_toward_sip",
                    "ON  ua_instance_message_toward_sip.ua_instance_id = ua_instance.id",
                    "AND ua_instance_message_toward_sip.message_toward_sip_id = message_toward_sip.id",
                    "WHERE dongle.imei = ? AND ua_instance.instance_id = ? AND ua_instance_message_toward_sip.delivered_date IS NULL",
                    "ORDER BY message_toward_sip.date"
                ].join("\n"),
                [dongle_imei, instance_id]
            );

            let messages: MessageTowardSip[]= [];

            for( let line of queryResult ){

                let message: MessageTowardSip ={
                    "id": line.id,
                    "date": new Date(line.date),
                    "from_number": line.from_number,
                    "text": (new Buffer(line.base64_text, "base64")).toString("utf8")
                };

                messages.push(message);

            }

            return messages;

        }
    );

    (async () => {

        require("rejection-tracker").main(__dirname, "..", "..");

        let imei= "1111111111";
        let iccid= "222222222";

        await addDongleAndSim(imei, iccid);

        let uaInstancePk: UaInstancePk= {
            "dongle_imei": imei,
            "instance_id": '"<urn:uuid:17b90ae9-1898-400c-8536-2f34435fd8c7>"'
        };

        await addUaInstance(uaInstancePk);

        //Incoming message from Dongle

        let number = "0636786385";
        let text= "foo bar";
        let date = new Date();

        let text2= "bar baz";

        await addMessageTowardSip(number, text2, new Date(date.getTime() + 1), { "uaInstance": uaInstancePk });

        let messageTowardSipId= await addMessageTowardSip(number, text, date, { "allUaInstanceOfImei": imei });

        await addMessageTowardSip(number, "never", date, { "allUaInstanceOfEndpointOtherThan": uaInstancePk });

        let messages= await getUndeliveredMessagesOfUaInstance(uaInstancePk);

        console.assert( messages.length === 2);
        console.assert( messages[0].date.getTime() === date.getTime());
        console.assert( messages[0].id === messageTowardSipId);
        console.assert( messages[0].from_number === number );
        console.assert( messages[0].text === text );

        console.assert( messages[1].text === text2);

        await setMessageTowardSipDelivered(uaInstancePk, messages[0].id);
        await setMessageTowardSipDelivered(uaInstancePk, messages[1].id);

        console.assert( (await getUndeliveredMessagesOfUaInstance(uaInstancePk)).length === 0);

        //Incoming message from sip

        let messageTowardGsmId= await addMessageTowardGsm(number, text, uaInstancePk);

        await addMessageTowardGsm(number, text2, uaInstancePk);

        let messages_= await getUnsentMessageOfDongleSim(imei);

        console.assert( messages_.length === 2);
        console.assert( messages_[0].id === messageTowardGsmId );
        console.assert( messages_[0].sender.instance_id === uaInstancePk.instance_id);
        console.assert( messages_[0].text === text);
        console.assert( messages_[0].to_number === number );

        let sent_message_id= 111222;

        await setMessageToGsmSentId( messageTowardGsmId, sent_message_id);

        let sender_and_text= await getSenderAndTextOfSentMessageToGsm(imei, sent_message_id);

        console.assert( sender_and_text!.text === text );
        console.assert( sender_and_text!.sender.instance_id === uaInstancePk.instance_id);

        console.assert( (await getUnsentMessageOfDongleSim(imei))[0].text === text2);

        console.log("PASS!");

    });

}


