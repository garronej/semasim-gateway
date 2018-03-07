import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "../types";
import { SyncEvent } from "ts-events-extended";
import "colors";
export declare const evtContactRegistration: SyncEvent<types.Contact>;
export declare namespace _protected {
    type Key = {
        connectionId: string;
        imsi: string;
    };
    namespace Key {
        function getId(key: Key): string;
    }
    function set(key: Key, socket: sipLibrary.Socket): void;
    /** null represent an expired connection */
    function get(key: Key): sipLibrary.Socket | null | undefined;
    function getSocketContact(socket: sipLibrary.Socket): types.Contact | Promise<types.Contact>;
}
export declare function getContacts(imsi?: string): types.Contact[];
export declare function flush(imsi?: string): void;
