import * as sipLibrary from "../../tools/sipLibrary";
import * as types from "../types";
import "colors";
export declare namespace asteriskSockets {
    function getContacts(imsi?: string): types.Contact[];
    function set(connectionId: number, imsi: string, socket: sipLibrary.Socket): void;
    function get(connectionId: number, imsi: string): sipLibrary.Socket | null | undefined;
    function getContact(socket: sipLibrary.Socket): types.Contact | Promise<types.Contact>;
    function flush(): void;
}
