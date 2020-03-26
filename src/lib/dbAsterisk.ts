import * as sqliteCustom from "sqlite-custom";
import * as types from "./types";
import * as i from "../bin/installer";
import { logger } from "../tools/logger";
const debug = logger.debugFactory();
import * as crypto from "crypto";
import * as runExclusive from "run-exclusive";


import { sipCallContext } from "./voiceCallBridge";
import { dialplanContext as messagesDialplanContext} from "./sipMessagesMonitor";

/*
NOTES: 
-Exported only for tests.
-asterisk.db is shared with asterisk as a result is asterisk
have the db locked wile we are trying to write a record queries
may fail. To cope with it we retry issuing the request until it passes.
-To implement retry we have to pass a higher order function that build
the sql query instead of the sql itself. This is because esc function
assume the sql query to be called only once.
*/
export let queryRetryUntilSuccess: (buildSql: () => string) => Promise<any>;
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

    queryRetryUntilSuccess= runExclusive.build(
        async (buildSql: () => string): Promise<any> => {

            const sql = buildSql();

            let out: any;

            try {

                out = await api.query(sql);

            } catch (error) {

                debug(error.stack);

                await new Promise(resolve => setTimeout(resolve, 100));

                return queryRetryUntilSuccess(buildSql);

            }

            return out;

        }
    );


    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;
    buildInsertOrUpdateQueries = api.buildInsertOrUpdateQueries;

    beforeExit.impl = () => api.close();

}

/** for test purpose only */
export async function flush() {

    await queryRetryUntilSuccess(() => {

        const sql = [
            "DELETE FROM ps_aors;",
            "DELETE FROM ps_auths;",
            "DELETE FROM ps_contacts;",
            "DELETE FROM ps_endpoints;",
        ].join("\n");

        return sql;

    });

}

export async function deleteContact(contact: types.Contact) {

    await queryRetryUntilSuccess(() => {

        const sql = [
            "DELETE FROM ps_contacts",
            `WHERE uri=${esc(contact.uri.replace(/;/g, "^3B"))}`
        ].join("\n");

        return sql;

    });

}

/** Helper function to generate a sip password */
export function generateSipEndpointPassword(): string {
    return crypto.randomBytes(16).toString("hex");
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

    const buildSql = () => {

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

                values["password"] = newPassword;

                sql += buildInsertOrUpdateQueries(table, values, ["id"]);

            } else {

                values["password"] = generateSipEndpointPassword();

                sql += buildInsertQuery(table, values, "IGNORE");

            }

        }

        const ps_endpoints = {
            "disallow": "all",
            "context": sipCallContext,
            "message_context": messagesDialplanContext,
            "auth": imsi,
            "from_domain": i.getBaseDomain(),
            "ice_support": "yes",
            "transport": "transport-tcp",
            "dtmf_mode": "info",
            "allow": "alaw:10,ulaw:10",
            "id": imsi,
            "aors": imsi,
            "use_avpf": "yes",
            "media_encryption": "dtls",
            "dtls_ca_file": i.ca_crt_path,
            "dtls_cert_file": i.host_pem_path,
            "dtls_verify": "fingerprint",
            "dtls_setup": "actpass",
            "media_use_received_transport": "yes",
            "rtcp_mux": "yes"
        };

        sql += buildInsertQuery("ps_aors", {
            "id": ps_endpoints.aors,
            "max_contacts": 30,
            "qualify_frequency": 0,
            "support_path": "yes"
        }, "IGNORE");

        sql += buildInsertQuery("ps_endpoints", ps_endpoints, "IGNORE");

        sql += `SELECT password FROM ps_auths WHERE id= ${esc(imsi)}`;

        return sql;

    };

    const { password } = (await queryRetryUntilSuccess(buildSql)).pop()[0];

    return password;

}
