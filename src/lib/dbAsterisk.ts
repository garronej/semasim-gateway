import * as sqliteCustom from "sqlite-custom";
import * as types from "./types";
import * as md5 from "md5";
import * as i from "../bin/installer";

import { sipCallContext } from "./voiceCallBridge";
import { dialplanContext as messagesDialplanContext} from "./sipMessagesMonitor";

//Note: Exported only for tests.
export let query: sqliteCustom.Api["query"];
export let esc: sqliteCustom.Api["esc"];
export let buildInsertQuery: sqliteCustom.Api["buildInsertQuery"];
export let buildInsertOrUpdateQueries: sqliteCustom.Api["buildInsertOrUpdateQueries"];

export function beforeExit() {
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl= ()=> Promise.resolve();
}

export async function launch(): Promise<void> {

    let api = await sqliteCustom.connectAndGetApi(i.ast_db_path);

    await api.query("DELETE FROM ps_contacts");

    query= api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;
    buildInsertOrUpdateQueries= api.buildInsertOrUpdateQueries;

    beforeExit.impl= ()=> api.close(); 

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

export async function deleteContact(contact: types.Contact) {

    await query(
        [
            "DELETE FROM ps_contacts",
            `WHERE uri=${esc(contact.uri.replace(/;/g, "^3B"))}`
        ].join("\n")
    );

}

/** Helper function to generate a sip password */
export function generateSipEndpointPassword(): string{
    return md5(`${Math.random()}`);
}

/**
 * 
 * If endpoint does not exist it is created.
 * If no password was provided one is generated.
 * 
 * If endpoint does exist and a password is 
 * provided then the old password is replaced
 * by the one provided. 
 * If no password was provided nothing is updated.
 * 
 * return the current password
 * 
 * 
 */
export async function createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(
    imsi: string,
    newPassword?: string
): Promise<string> {

    let sql = "";

    {

        const table = "ps_auths";

        const values = {
            "id": imsi,
            "auth_type": "userpass",
            "username": imsi,
            "realm": "semasim"
        };

        if (newPassword !== undefined) {

            values["password"]= newPassword;

            sql += buildInsertOrUpdateQueries(table, values, ["id"]);

        } else {

            values["password"]= generateSipEndpointPassword();

            sql += buildInsertQuery(table, values, "IGNORE");

        }

    }

    const [ps_endpoints_web, ps_endpoints_mobile] = (() => {

        const ps_endpoints_base = {
            "disallow": "all",
            "allow": "alaw,ulaw",
            "context": sipCallContext,
            "message_context": messagesDialplanContext,
            "auth": imsi,
            "from_domain": "semasim.com",
            "ice_support": "yes",
            "transport": "transport-tcp",
            "dtmf_mode": "info"
        };

        const webId = `${imsi}-webRTC`;

        return [{
            "id": webId,
            "aors": webId,
            ...ps_endpoints_base,
            "use_avpf": "yes",
            "media_encryption": "dtls",
            "dtls_ca_file": i.ca_crt_path,
            "dtls_cert_file": i.host_pem_path,
            "dtls_verify": "fingerprint",
            "dtls_setup": "actpass",
            "media_use_received_transport": "yes",
            "rtcp_mux": "yes"
        }, {
            "id": imsi,
            "aors": imsi,
            ...ps_endpoints_base
        }];

    })();

    for (const ps_endpoints of [ps_endpoints_mobile, ps_endpoints_web]) {

        sql += buildInsertQuery("ps_aors", {
            "id": ps_endpoints.aors,
            "max_contacts": 30,
            "qualify_frequency": 0,
            "support_path": "yes"
        }, "IGNORE");

        sql += buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");

    }

    sql += `SELECT password FROM ps_auths WHERE id= ${esc(imsi)}`;

    const { password } = (await query(sql)).pop()[0];

    return password;

}