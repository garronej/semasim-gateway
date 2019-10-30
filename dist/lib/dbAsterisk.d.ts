import * as sqliteCustom from "sqlite-custom";
import * as types from "./types";
export declare let queryRetryUntilSuccess: (buildSql: () => string) => Promise<any>;
export declare let esc: sqliteCustom.Api["esc"];
export declare let buildInsertQuery: sqliteCustom.Api["buildInsertQuery"];
export declare let buildInsertOrUpdateQueries: sqliteCustom.Api["buildInsertOrUpdateQueries"];
export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
export declare function launch(): Promise<void>;
/** for test purpose only */
export declare function flush(): Promise<void>;
export declare function deleteContact(contact: types.Contact): Promise<void>;
/** Helper function to generate a sip password */
export declare function generateSipEndpointPassword(): string;
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
export declare function createEndpointIfNeededOptionallyReplacePasswordAndReturnPassword(imsi: string, newPassword?: string): Promise<string>;
