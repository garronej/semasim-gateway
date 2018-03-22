import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import * as types from "../types";

import * as mysqlCustom from "../../tools/mysqlCustom";
import { MySqlEvents } from "../../tools/MySqlEvents";

import { sipCallContext } from "../voiceCallBridge";
import { messagesDialplanContext } from "../sipProxy";

import * as c from "../_constants"

//Note: Exported only for tests.
export let query: mysqlCustom.Api["query"];
export let esc: mysqlCustom.Api["esc"];
export let buildInsertQuery: mysqlCustom.Api["buildInsertQuery"];

export async function launch(): Promise<void> {

    const connectionConfig: mysql.IConnectionConfig = {
        ...c.dbParamsGateway,
        "database": "asterisk"
    };

    let api = await mysqlCustom.connectAndGetApi(connectionConfig);

    await api.query([
        "DELETE FROM ps_contacts",
        "WHERE endpoint LIKE '_______________'"
    ].join("\n"));

    await MySqlEvents.launch(connectionConfig);


    let post = (row, evt: SyncEvent<types.Contact>) =>
        evt.post(types.misc.buildContactFromPsContact(row))
        ;

    evtNewContact= new SyncEvent();

    MySqlEvents.instance.evtNewRow.attach(
        ({ table }) => table === "ps_contacts",
        ({ row }) => post(row, evtNewContact)
    );

    evtExpiredContact= new SyncEvent();

    MySqlEvents.instance.evtDeleteRow.attach(
        ({ table }) => table === "ps_contacts",
        ({ row }) => post(row, evtExpiredContact)
    );

    query= api.query;
    esc= api.esc;
    buildInsertQuery= api.buildInsertQuery;

}

export let evtNewContact: SyncEvent<types.Contact>;

export let evtExpiredContact: SyncEvent<types.Contact>;

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

export function deleteContact(contact: types.Contact) {
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

    /*
        "subscribe_context": null,
        "force_rport": null,
        "direct_media": null,
        "asymmetric_rtp_codec": null,
        "rtcp_mux": null,
        "direct_media_method": null,
        "connected_line_method": null,
        "callerid_tag": null
    */

    /*
    //For webRTC:
    sql += buildInsertQuery("ps_endpoints", {
        "id": imsi,
        "disallow": "all",
        "allow": "opus,alaw,ulaw",
        "use_avpf": "yes",
        "media_encryption": "dtls",
        "dtls_ca_file": "/etc/asterisk/keys/ca.crt",
        "dtls_cert_file": "/etc/asterisk/keys/asterisk.pem",
        "dtls_verify": "fingerprint",
        "dtls_setup": "actpass",
        "media_use_received_transport": "yes",
        "rtcp_mux": "yes",
        "context": sipCallContext,
        "message_context": messages_dialplanContext,
        "aors": imsi,
        "auth": imsi,
        "from_domain": c.domain,
        "ice_support": "yes",
        "transport": "transport-tcp"
    }, "IGNORE");
    */

    //For Linphone:
    sql += buildInsertQuery("ps_endpoints", {
                "id": imsi,
                "disallow": "all",
                "allow": "alaw,ulaw",
                //"allow": "opus",
                "use_avpf": null,
                "media_encryption": null,
                "dtls_ca_file": null,
                "dtls_verify": null,
                "dtls_setup": null,
                "media_use_received_transport": null,
                "rtcp_mux": null,
                "context": sipCallContext,
                "message_context": messagesDialplanContext,
                "aors": imsi,
                "auth": imsi,
                "from_domain": c.domain,
                "ice_support": "yes",
                "transport": "transport-tcp",
    }, "IGNORE");

    sql += `SELECT password FROM ps_auths WHERE id= ${esc(imsi)}`;

    let { password } = (await query(sql)).pop()[0];

    return password;

}

