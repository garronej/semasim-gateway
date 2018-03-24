import * as sipLibrary from "../../tools/sipLibrary";

/** map connectionId+imsi => asteriskSocket
 * PROTECTED: only for contactsRegistrationMonitor.ts
 */
export const map = new Map<string, sipLibrary.Socket | null>();

export type Key = { connectionId: string; imsi: string };

export namespace Key {
    export function getId(key: Key): string {
        return `${key.connectionId};${key.imsi}`;
    }
}

export function set(
    key: Key,
    asteriskSocket: sipLibrary.Socket
) {

    let id= Key.getId(key);

    map.set(id, asteriskSocket);

    asteriskSocket.evtClose.attachOncePrepend(() => { 

        map.set(id, null);

        setTimeout(()=> map.delete(id), 60000).unref();

    });

}

/** null represent an expired connection */
export function get(
    key: Key
): sipLibrary.Socket | null | undefined {
    return map.get(Key.getId(key));
}

export function flush(){

    for( let asteriskSocket of map.values() ){

        if( asteriskSocket === null ){
            continue;
        }

        asteriskSocket.destroy();

    }

}

/*
export function getAll(): sipLibrary.Socket[]{

    return Array.from(map.values())
        .filter(asteriskSocket => asteriskSocket !== null) as sipLibrary.Socket[];

}
*/
