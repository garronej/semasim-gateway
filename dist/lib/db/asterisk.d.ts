import { SyncEvent } from "ts-events-extended";
import * as types from "../types";
import * as mysqlCustom from "../../tools/mysqlCustom";
export declare let query: mysqlCustom.Api["query"];
export declare let esc: mysqlCustom.Api["esc"];
export declare let buildInsertQuery: mysqlCustom.Api["buildInsertQuery"];
export declare function launch(): Promise<void>;
export declare let evtNewContact: SyncEvent<types.Contact>;
export declare let evtExpiredContact: SyncEvent<types.Contact>;
/** for test purpose only */
export declare function flush(): Promise<void>;
export declare function deleteContact(contact: types.Contact): Promise<boolean>;
export declare function createEndpointIfNeededAndGetPassword(imsi: string, renewPassword?: "RENEW PASSWORD" | undefined): Promise<string>;
