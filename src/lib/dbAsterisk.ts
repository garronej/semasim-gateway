import { SyncEvent } from "ts-events-extended";
import * as mysql from "mysql";
import * as types from "./types";

import * as f from "../tools/mySqlFunctions";
import { MySqlEvents } from "../tools/MySqlEvents";

import { sipCallContext } from "./voiceCallBridge";
import { sipMessageContext } from "./sipMessage";

import * as c from "./_constants"

const connectionConfig: mysql.IConnectionConfig = {
    ...c.dbParamsGateway,
    "database": "asterisk"
};

/** is exported only for tests */
export const { query, esc, buildInsertQuery } = f.getUtils(connectionConfig);

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

export const evtNewContact = new SyncEvent<types.Contact>();

export const evtExpiredContact = new SyncEvent<types.Contact>();

export async function startListeningPsContacts(): Promise<void> {

    await query([
        "DELETE FROM ps_contacts",
        "WHERE endpoint LIKE '_______________'"
    ].join("\n"));

    await MySqlEvents.initialize(connectionConfig);

    let post= (row, evt: SyncEvent<types.Contact>)=> 
        evt.post(types.misc.buildContactFromPsContact(row))
    ;

    MySqlEvents.instance.evtNewRow.attach(
        ({ table }) => table === "ps_contacts",
        ({ row }) => post(row, evtNewContact)
    );

    MySqlEvents.instance.evtDeleteRow.attach(
        ({ table }) => table === "ps_contacts",
        ({ row }) => post(row, evtExpiredContact)
    );

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

    sql += buildInsertQuery("ps_endpoints", {
        "id": imsi,
        "disallow": "all",
        "allow": "alaw,ulaw",
        "context": sipCallContext,
        "message_context": sipMessageContext,
        "subscribe_context": null,
        "aors": imsi,
        "auth": imsi,
        "force_rport": null,
        "from_domain": c.domain,
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
