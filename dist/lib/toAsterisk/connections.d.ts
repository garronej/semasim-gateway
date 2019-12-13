import * as sip from "ts-sip";
/** Assert we have an active backend connection */
export declare function connect(connectionId: string, imsi: string): sip.Socket;
declare namespace connections {
    type Key = {
        imsi: string;
        connectionId: string;
    };
    export namespace Key {
        const stringify: (key: Key) => string;
    }
    export function set(key: Key, socket: sip.Socket): void;
    export function get(key: Key): sip.Socket | undefined;
    export function remove(key: Key): void;
    export {};
}
export declare const get: typeof connections.get;
export {};
