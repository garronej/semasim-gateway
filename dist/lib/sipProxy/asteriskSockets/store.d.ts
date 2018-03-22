import * as sipLibrary from "../../../tools/sipLibrary";
import { SyncEvent } from "ts-events-extended";
import * as types from "../../types";
export declare const evtNewAsteriskSocket: SyncEvent<{
    asteriskSocket: sipLibrary.Socket;
    prContact: Promise<types.Contact>;
}>;
/** map connectionId+imsi => asteriskSocket
 * PROTECTED: only for contactsRegistrationMonitor.ts
 */
export declare const map: Map<string, sipLibrary.Socket | null>;
export declare type Key = {
    connectionId: string;
    imsi: string;
};
export declare namespace Key {
    function getId(key: Key): string;
}
export declare function set(key: Key, asteriskSocket: sipLibrary.Socket): void;
/** null represent an expired connection */
export declare function get(key: Key): sipLibrary.Socket | null | undefined;
export declare function flush(): void;
