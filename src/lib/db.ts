import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import * as md5 from "md5";
import { PsContact, Contact } from "./sipContact";

import * as f from "../tools/mySqlFunctions";
import { MySqlEvents } from "../tools/MySqlEvents";
import { c } from "./_constants"
import { DongleController as Dc } from "chan-dongle-extended-client";

import * as _debug from "debug";
let debug = _debug("_db");

export namespace asterisk {

    const connectionConfig: mysql.IConnectionConfig = {
        ...c.dbParamsGateway,
        "database": "asterisk",
        "multipleStatements": true
    };

    export async function initializeEvt(): Promise<void> {

        await MySqlEvents.initialize(connectionConfig);

    }

    let connection: mysql.IConnection | undefined = undefined;

    export function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection){

            connection = mysql.createConnection(connectionConfig);

        }

        return f.queryOnConnection(connection, sql, values);

    }

    let evtNewContact: SyncEvent<Contact> | undefined = undefined;
    export function getEvtNewContact() {

        if (evtNewContact) return evtNewContact;

        evtNewContact = new SyncEvent<Contact>();

        MySqlEvents.instance.evtNewRow.attach(
            ({ database, table }) => (
                database === connectionConfig.database &&
                table === "ps_contacts"
            ),
            async ({ row }) => { 

                let { id, endpoint, path, uri, user_agent } = row;

                let psContact: PsContact= { id, endpoint, path, uri, user_agent };

                let contact= await PsContact.buildContact(psContact);

                evtNewContact!.post(contact);

            }
        );

        return evtNewContact;

    }

    let evtExpiredContact: SyncEvent<Contact> | undefined = undefined;
    export function getEvtExpiredContact() {

        if (evtExpiredContact) return evtExpiredContact;

        evtExpiredContact = new SyncEvent<Contact>();

        MySqlEvents.instance.evtDeleteRow.attach(
            ({ database, table }) => (
                database === connectionConfig.database &&
                table === "ps_contacts"
            ),
            async ({ row }) => { 

                let { id, endpoint, path, uri, user_agent } = row;

                let psContact: PsContact= { id, endpoint, path, uri, user_agent };

                let contact= await PsContact.buildContact(psContact);

                evtExpiredContact!.post(contact);

            }
        );

        return evtExpiredContact;

    }

    export async function getContacts(
        endpoint: Contact.UaEndpoint.EndpointRef
    ): Promise<Contact[]> {

        let sql= [
            "SELECT", 
            "ps_contacts.id,",
            "ps_contacts.uri,",
            "ps_contacts.path,",
            "ps_contacts.endpoint,",
            "ps_contacts.user_agent",
            "FROM ps_contacts",
            "INNER JOIN ps_endpoints ON ps_endpoints.id= ps_contacts.endpoint",
            `WHERE ps_endpoints.id= ? AND ps_endpoints.set_var='ICCID=${endpoint.sim.iccid}'`
        ].join("\n");

        let values= [ endpoint.dongle.imei ];

        let psContacts: PsContact[] = await query(sql, values);

        let contacts: Contact[] = [];

        let tasks: Promise<number>[] = [];

        for (let psContact of psContacts){

            tasks[tasks.length] = (async () =>
                contacts.push(await PsContact.buildContact(psContact))
            )();

        }

        await Promise.all(tasks);

        return contacts;

    }

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

    export async function flushContacts(): Promise<void> {

        let endpoints= await semasim.getEndpoints();

        let contacts: Contact[]=[];

        for( let endpoint of endpoints ){

            contacts= [...contacts, ...(await getContacts(endpoint))];
            
        }

        let tasks: Promise<boolean>[]= [];

        for( let contact of contacts ){
            tasks.push(deleteContact(contact));
        }

        await Promise.all(tasks);

    }



    export function deleteContact(contact: Contact) {
        return new Promise<boolean>((resolve, reject) => {

            let timerId = setTimeout(
                () => reject(new Error(`Delete contact ${contact.pretty} timeout error`)),
                3000
            );

            let queryPromise = (async () => {

                let { affectedRows } = await query(
                    "DELETE FROM ps_contacts WHERE id=?", [contact.ps.id]
                );

                let isDeleted = affectedRows ? true : false;

                if (!isDeleted) {
                    getEvtExpiredContact().detach(timerId);
                    clearTimeout(timerId);
                    resolve(false);
                }

            })();

            getEvtExpiredContact().attachOnceExtract(
                ({ ps }) => ps.id === contact.ps.id,
                timerId,
                deletedContact => queryPromise.then(() => {
                    clearTimeout(timerId);
                    resolve(true);
                })
            );

        });
    }



    export async function addEndpoint(
        imei: string,
        iccid: string
    ) {

        let sql = "";
        let values: (string | number | null)[] = [];

        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_aors", {
                "id": imei,
                "max_contacts": 12,
                "qualify_frequency": 0, //15000
                "support_path": "yes"
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        (() => {

            let last_four_digits_of_iccid = iccid.substring(iccid.length - 4);

            let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_auths", {
                "id": imei,
                "auth_type": "userpass",
                "username": imei,
                "password": last_four_digits_of_iccid,
                "realm": "semasim"
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("ps_endpoints", {
                "id": imei,
                "disallow": "all",
                "allow": "alaw,ulaw",
                "context": c.sipCallContext,
                "message_context": c.sipMessageContext,
                "subscribe_context": null,
                "aors": imei,
                "auth": imei,
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
                "set_var": `ICCID=${iccid}`
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        await query(sql, values);

    }

    export async function getIccidOfEndpoint(imei: string): Promise<string> {

        let [{ set_var }] = await query(
            "SELECT set_var FROM ps_endpoints WHERE id=?",
            [imei]
        );

        let iccid = set_var.match(/ICCID=([0-9]+)/)[1];

        return iccid;

    }

}

export namespace semasim {

    let connection: mysql.IConnection | undefined = undefined;

    export function query(
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

    /** Only for test purpose */
    export async function flush() {

        let sql = [
            "DELETE FROM dongle;",
            "DELETE FROM sim;",
            "DELETE FROM ua;",
            "DELETE FROM message_toward_sip;",
        ].join("\n");

        await query(sql);

    }

    //We do not update is voice enabled
    export async function addDongle(
        dongle: Dc.LockedDongle
    ) {

        let sql = [
            "INSERT INTO dongle ( imei, last_connection_date, is_voice_enabled )",
            "VALUES ( ?, ?, ?)",
            "ON DUPLICATE KEY UPDATE last_connection_date = VALUES(last_connection_date)"
        ].join("\n");

        let values = [dongle.imei, Date.now(), null];

        await query(sql, values);


    }

    /** return set of imei => last_connection_date */
    export async function getDonglesLastConnection() {

        let sql = "SELECT imei, last_connection_date FROM dongle";

        let rows = await query(sql);

        let out= new Map<string, Date>();

        for (let row of rows) {

            out.set(
                row["imei"],
                new Date(row["last_connection_date"])
            );

        }

        return out;

    }

    //For claiming the newer the better
    //Add or update is_voice_enabled dongle
    //Add or update sim
    //Add or update endpoint
    export async function addEndpoint(
        dongle: Dc.ActiveDongle
    ) {

        let sql = "";
        let values: (string | number | null)[] = [];

        let now = Date.now();

        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("dongle", {
                "imei": dongle.imei,
                "last_connection_date": now,
                "is_voice_enabled": f.booleanOrUndefinedToSmallIntOrNull(dongle.isVoiceEnabled)
            });

            sql += _sql;

            values = [...values, ..._values];


        })();

        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("sim", {
                "iccid": dongle.sim.iccid,
                "imsi": dongle.sim.imsi
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("endpoint", {
                "dongle_imei": dongle.imei,
                "sim_iccid": dongle.sim.iccid
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        await query(sql, values);

    }

    export async function getUas(
        imei: string
    ): Promise<Contact.UaEndpoint.Ua[]> {

        let sql= [
            "SELECT",
            "ua.instance,",
            "ua.push_token,",
            "ua.software",
            "FROM ua",
            "INNER JOIN ua_endpoint ON ua_endpoint.ua_instance= ua.instance",
            "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
            "WHERE endpoint.dongle_imei= ?"
        ].join("\n");

        let values= [ imei ];

        let rows= await query(sql, values);

        let out: Contact.UaEndpoint.Ua[]= [];

        for( let row of rows ){

            out[out.length]= {
                "instance": row["instance"],
                "pushToken": Contact.UaEndpoint.Ua.PushToken.parse(row["push_token"]),
                "software": row["software"]
            };

        }

        return out;

    }

    /** Used to join asterisk.ps_endpoint and semasim.endpoint, used when building contact */
    export async function getEndpoint(
        endpointRef: Contact.UaEndpoint.EndpointRef
    ): Promise<Contact.UaEndpoint.Endpoint> {

        let [ endpoint ] = await _getEndpoint(endpointRef);

        return endpoint;

    }

    export function getEndpoints() {
        return _getEndpoint();
    }

    async function _getEndpoint(
        endpointRef?: Contact.UaEndpoint.EndpointRef
    ): Promise<Contact.UaEndpoint.Endpoint[]> {

        let sql = [
            "SELECT",
            "dongle.imei,",
            "dongle.last_connection_date,",
            "dongle.is_voice_enabled,",
            "sim.iccid,",
            "sim.imsi",
            "FROM endpoint",
            "INNER JOIN dongle ON dongle.imei = endpoint.dongle_imei",
            "INNER JOIN sim ON sim.iccid = endpoint.sim_iccid"
        ].join("\n");

        let values: (string | number | null)[];

        if (endpointRef) {

            sql += "\n" + "WHERE dongle.imei = ? AND sim.iccid = ?";
            values = [endpointRef.dongle.imei, endpointRef.sim.iccid];

        } else {

            values = [];

        }

        let rows = await query(sql, values);

        let out: Contact.UaEndpoint.Endpoint[] = [];

        for (let row of rows) {

            out[out.length] = {
                "dongle": {
                    "imei": row["imei"],
                    "lastConnectionDate": new Date(row["last_connection_date"]),
                    "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row.is_voice_enabled)
                },
                "sim": {
                    "iccid": row["iccid"],
                    "imsi": row["imsi"]
                }
            };

        }

        return out;

    }


    export type AddUaEndpointResult =
        {
            isNewUa: false;
            isFirstUaEndpointOfEndpoint: false;
        } | {
            isNewUa: true;
            isFirstUaEndpointOfEndpoint: boolean;
        };

    //Add or update ua
    //Add or update ua_endpoint
    /** Return true if ua_endpoint entry created */
    export async function addUaEndpoint(
        uaEndpoint: Contact.UaEndpoint
    ): Promise<AddUaEndpointResult> {

        let sql = "";
        let values: (string | number | null)[] = [];

        (() => {

            let ua = uaEndpoint.ua;

            let { instance, software } = ua;

            let [_sql, _values] = f.buildInsertOrUpdateQuery("ua", {
                instance,
                software,
                "push_token": Contact.UaEndpoint.Ua.PushToken.stringify(ua.pushToken)
            });

            sql += _sql;

            values = [...values, ..._values];

        })();


        let endpoint_ref = "A";

        sql += [
            `SELECT @${endpoint_ref}:=id_`,
            "FROM endpoint",
            `WHERE dongle_imei=? AND sim_iccid=?`,
            ";",
            ""
        ].join("\n");

        values = [
            ...values,
            uaEndpoint.endpoint.dongle.imei,
            uaEndpoint.endpoint.sim.iccid
        ];

        sql += [
            `SELECT COUNT(*) as total`,
            "FROM ua_endpoint",
            "INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint",
            "WHERE endpoint.dongle_imei= ? AND endpoint.sim_iccid= ?",
            ";",
            ""
        ].join("\n");

        values = [
            ...values,
            uaEndpoint.endpoint.dongle.imei,
            uaEndpoint.endpoint.sim.iccid
        ];


        (() => {

            let [_sql, _values] = f.buildInsertOrUpdateQuery("ua_endpoint", {
                "ua_instance": uaEndpoint.ua.instance,
                "endpoint": { "@": endpoint_ref }
            });

            sql += _sql;

            values = [...values, ..._values];

        })();

        let rows = await query(sql, values);

        let { insertId } = rows.pop();

        let isNewUa = insertId !== 0;

        if (!isNewUa) {
            return {
                isNewUa,
                "isFirstUaEndpointOfEndpoint": false
            };
        }

        let [{total}] = rows.pop();

        return {
            isNewUa,
            "isFirstUaEndpointOfEndpoint": total === 0
        };

    }



    export interface MessageTowardGsm {
        date: Date;
        uaEndpoint: Contact.UaEndpoint;
        to_number: string;
        text: string;
    };

    export namespace MessageTowardGsm {

        export async function add(
            to_number: string,
            text: string,
            uaEndpoint: Contact.UaEndpointRef
        ): Promise<void> {

            let sql = "";
            let values: (string | number | null)[] = [];

            let ua_endpoint_ref = "A";

            sql += [
                `SELECT @${ua_endpoint_ref}:= ua_endpoint.id_`,
                `FROM ua_endpoint`,
                `INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint`,
                `WHERE ua_endpoint.ua_instance=? AND endpoint.dongle_imei=? AND endpoint.sim_iccid=?`,
                `;`,
                ``
            ].join("\n");

            values = [
                ...values,
                uaEndpoint.ua.instance,
                uaEndpoint.endpoint.dongle.imei,
                uaEndpoint.endpoint.sim.iccid
            ];

            (() => {

                let [_sql, _values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                    "date": Date.now(),
                    "ua_endpoint": { "@": ua_endpoint_ref },
                    "to_number": to_number,
                    "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                    "send_date": null
                });

                sql += _sql;

                values = [...values, ..._values];

            })();

            await query(sql, values);

        }


        export type Confirm = {
            setSent(sentDate: Date | null): Promise<void>;
            setStatusReport(statusReport: Dc.StatusReport): Promise<void>
        };

        export async function getUnsent(
            endpoint: Contact.UaEndpoint.EndpointRef
        ) {

            let sql = [
                `SELECT`,
                `message_toward_gsm.id_,`,
                `message_toward_gsm.date,`,
                `message_toward_gsm.to_number,`,
                `message_toward_gsm.base64_text,`,
                `ua.instance,`,
                `ua.push_token,`,
                `ua.software,`,
                `dongle.imei,`,
                `dongle.last_connection_date,`,
                `dongle.is_voice_enabled,`,
                `sim.iccid,`,
                `sim.imsi`,
                `FROM message_toward_gsm`,
                `INNER JOIN ua_endpoint ON ua_endpoint.id_ = message_toward_gsm.ua_endpoint`,
                `INNER JOIN ua ON ua.instance = ua_endpoint.ua_instance`,
                `INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint`,
                `INNER JOIN dongle ON dongle.imei = endpoint.dongle_imei`,
                `INNER JOIN sim ON sim.iccid = endpoint.sim_iccid`,
                `WHERE dongle.imei=? AND sim.iccid=? AND message_toward_gsm.send_date IS NULL`,
                `ORDER BY message_toward_gsm.date`,
                `;`
            ].join("\n");

            let values = [
                endpoint.dongle.imei,
                endpoint.sim.iccid
            ];

            let rows = await query(sql, values);

            let out: [MessageTowardGsm, Confirm][] = [];

            for (let row of rows) {

                let message: MessageTowardGsm = {
                    "date": new Date(row["date"]),
                    "uaEndpoint": {
                        "endpoint": {
                            "dongle": {
                                "imei": row["imei"],
                                "lastConnectionDate": new Date(row["last_connection_date"]),
                                "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"])
                            },
                            "sim": {
                                "iccid": row["iccid"],
                                "imsi": row["imsi"]
                            }
                        },
                        "ua": {
                            "instance": row["instance"],
                            "pushToken": Contact.UaEndpoint.Ua.PushToken.parse(row["push_token"]),
                            "software": row["software"]
                        }
                    },
                    "to_number": row["to_number"],
                    "text": (new Buffer(row["base64_text"], "base64")).toString("utf8")
                };

                let message_toward_gsm_id_ = row["id_"];

                let confirm: Confirm = {
                    "setSent": async sentDate => {

                        let [sql, values] = f.buildInsertOrUpdateQuery("message_toward_gsm", {
                            "id_": message_toward_gsm_id_,
                            "send_date": sentDate ? sentDate.getTime() : -1
                        });

                        await query(sql, values);

                    },
                    "setStatusReport": async statusReport => {

                        let [sql, values] = f.buildInsertOrUpdateQuery(
                            "message_toward_gsm_status_report",
                            {
                                "message_toward_gsm": message_toward_gsm_id_,
                                "is_delivered": statusReport.isDelivered ? 1 : 0,
                                "discharge_date": isNaN(statusReport.dischargeDate.getTime()) ? null : statusReport.dischargeDate.getTime(),
                                "status": statusReport.status
                            }
                        );

                        await query(sql, values);

                    }
                };

                out.push([message, confirm]);

            }

            return out;

        }

    }

    export async function lastGsmMessageReceived(
        endpoint: Contact.UaEndpoint.EndpointRef
    ): Promise<Date | undefined> {

        let sql = [
            "SELECT COUNT(*) AS count",
            "FROM ua_endpoint",
            "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
            "WHERE endpoint.dongle_imei=? AND endpoint.sim_iccid=?",
            ";",
            "SELECT MAX(message_toward_sip.date) as time",
            "FROM message_toward_sip",
            "INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip=message_toward_sip.id_",
            "INNER JOIN ua_endpoint ON ua_endpoint.id_ = ua_endpoint_message_toward_sip.ua_endpoint",
            "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
            "WHERE message_toward_sip.is_report=0 AND endpoint.dongle_imei =? AND endpoint.sim_iccid= ?"
        ].join("\n");

        let values = [
            endpoint.dongle.imei,
            endpoint.sim.iccid
        ];

        values = [ ...values, ...values ];

        let [[{ count }], r2] = await query(sql, values);

        if (!count) {

            return undefined;

        } else {

            let [{ time }] = r2;

            if (time === null) {
                return new Date(0);
            } else {
                return new Date(time);
            }

        }

    }


    export interface MessageTowardSip {
        isReport: boolean;
        date: Date;
        from_number: string;
        text: string;
    }

    export namespace MessageTowardSip {

        export type TargetUaEndpoint =
            {
                is: "ALL UA_ENDPOINT OF ENDPOINT";
                endpoint: Contact.UaEndpoint.EndpointRef;
            } | {
                is: "UA_ENDPOINT";
                uaEndpoint: Contact.UaEndpointRef;
            } | {
                is: "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA"
                endpoint: Contact.UaEndpoint.EndpointRef;
                excludeUa: Contact.UaEndpoint.UaRef;
            }

        export async function add(
            from_number: string,
            text: string,
            date: Date,
            is_report: boolean,
            target: TargetUaEndpoint
        ): Promise<void> {

            let sql_ = [
                "FROM ua_endpoint",
                "INNER JOIN endpoint ON endpoint.id_ = ua_endpoint.endpoint",
                "WHERE endpoint.dongle_imei= ? AND endpoint.sim_iccid= ?"
            ].join("\n");

            let values_: (string | number | null)[] = [];

            switch (target.is) {
                case "ALL UA_ENDPOINT OF ENDPOINT":
                    values_ = [
                        target.endpoint.dongle.imei,
                        target.endpoint.sim.iccid
                    ];
                    break;
                case "UA_ENDPOINT":
                    sql_ += "\n" + "AND ua_endpoint.ua_instance = ?";
                    values_ = [
                        target.uaEndpoint.endpoint.dongle.imei,
                        target.uaEndpoint.endpoint.sim.iccid,
                        target.uaEndpoint.ua.instance
                    ];
                    break;
                case "ALL UA_ENDPOINT OF ENDPOINT EXCEPT UA":
                    sql_ += "\n" + "AND ua_endpoint.ua_instance <> ?";
                    values_ = [
                        target.endpoint.dongle.imei,
                        target.endpoint.sim.iccid,
                        target.excludeUa.instance
                    ];
                    break;
            }

            let sql = [
                "INSERT INTO message_toward_sip ( is_report, date, from_number, base64_text )",
                "SELECT ?, ?, ?, ?",
                sql_,
                "HAVING COUNT(*) <> 0",
                ";",
                ""
            ].join("\n");

            let values: (string | number | null)[] = [
                f.booleanOrUndefinedToSmallIntOrNull(is_report),
                date.getTime(),
                from_number,
                (new Buffer(text, "utf8")).toString("base64"),
                ...values_
            ];

            sql += [
                `INSERT INTO ua_endpoint_message_toward_sip`,
                `( ua_endpoint, message_toward_sip, delivered_date )`,
                `SELECT ua_endpoint.id_, LAST_INSERT_ID(), NULL`,
                sql_
            ].join("\n");

            values = [...values, ...values_];

            await query(sql, values);

        }


        export async function unsentCount(
            uaEndpoint: Contact.UaEndpointRef
        ): Promise<number> {

            let sql = [
                `SELECT COUNT(*) AS count`,
                `FROM message_toward_sip`,
                `INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip= message_toward_sip.id_`,
                `INNER JOIN ua_endpoint ON ua_endpoint.id_= ua_endpoint_message_toward_sip.ua_endpoint`,
                `INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint`,
                `WHERE ua_endpoint_message_toward_sip.delivered_date IS NULL`,
                `AND ua_endpoint.ua_instance=?`,
                `AND endpoint.dongle_imei=?`,
                `AND endpoint.sim_iccid=?`
            ].join("\n");

            let values = [
                uaEndpoint.ua.instance,
                uaEndpoint.endpoint.dongle.imei,
                uaEndpoint.endpoint.sim.iccid
            ];

            return (await query(sql, values))[0]["count"];

        }



        export async function getUnsent(
            uaEndpoint: Contact.UaEndpointRef
        ) {

            let sql = [
                `SELECT`,
                `message_toward_sip.is_report,`,
                `message_toward_sip.date,`,
                `message_toward_sip.from_number,`,
                `message_toward_sip.base64_text,`,
                `ua_endpoint_message_toward_sip.id_`,
                `FROM message_toward_sip`,
                `INNER JOIN ua_endpoint_message_toward_sip ON ua_endpoint_message_toward_sip.message_toward_sip= message_toward_sip.id_`,
                `INNER JOIN ua_endpoint ON ua_endpoint.id_= ua_endpoint_message_toward_sip.ua_endpoint`,
                `INNER JOIN endpoint ON endpoint.id_= ua_endpoint.endpoint`,
                `WHERE ua_endpoint_message_toward_sip.delivered_date IS NULL`,
                `AND ua_endpoint.ua_instance=?`,
                `AND endpoint.dongle_imei=?`,
                `AND endpoint.sim_iccid=?`,
                `ORDER BY message_toward_sip.date`
            ].join("\n");

            let values = [
                uaEndpoint.ua.instance,
                uaEndpoint.endpoint.dongle.imei,
                uaEndpoint.endpoint.sim.iccid
            ];

            let rows = await query(sql, values);

            let out = new Array<[MessageTowardSip, () => Promise<void>]>();

            for (let row of rows) {

                let message: MessageTowardSip = {
                    "date": new Date(row["date"]),
                    "from_number": row["from_number"],
                    "isReport": row["is_report"] === 1,
                    "text": (new Buffer(row["base64_text"], "base64")).toString("utf8"),
                };

                let setReceived = async () => {

                    let [sql, values] = f.buildInsertOrUpdateQuery(
                        "ua_endpoint_message_toward_sip",
                        {
                            "id_": row["id_"],
                            "delivered_date": Date.now()
                        }
                    );

                    await query(sql, values);

                };

                out.push([message, setReceived]);

            }

            return out;

        }


    }


}

