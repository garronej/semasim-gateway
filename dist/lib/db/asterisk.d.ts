import * as sqliteCustom from "../../tools/sqliteCustom";
import * as types from "../types";
export declare let query: sqliteCustom.Api["query"];
export declare let esc: sqliteCustom.Api["esc"];
export declare let buildInsertQuery: sqliteCustom.Api["buildInsertQuery"];
export declare let buildInsertOrUpdateQueries: sqliteCustom.Api["buildInsertOrUpdateQueries"];
export declare function launch(): Promise<void>;
/** for test purpose only */
export declare function flush(): Promise<void>;
export declare function deleteContact(contact: types.Contact): Promise<void>;
export declare function createEndpointIfNeededAndGetPassword(imsi: string, renewPassword?: "RENEW PASSWORD" | undefined): Promise<string>;
