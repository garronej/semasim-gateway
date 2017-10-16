import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import * as sipLibrary from "../tools/sipLibrary";
import * as db from "./db";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_sipContact");


export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}

export namespace PsContact {

    export type Wrapped= {
        ua_instance: string;
        ua_software: string;
        connectionId: number;
    }

    export function buildUserAgentFieldValue(
        wrap: Wrapped
    ): string {
        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64");
    }

    export function parseWrapped(
        user_agent: string
    ): Wrapped {
        return JSON.parse((new Buffer(user_agent, "base64")).toString("utf8"));
    }

    function readPushNotification(
        uri: string
    ): Contact.UaEndpoint.Ua.PushToken | undefined {

        let { params } = sipLibrary.parseUri(uri);

        let type = params["pn-type"];
        let token = params["pn-tok"];

        if (type === null || token === null) return undefined;

        return { type, token };

    }

    export async function buildContact(psContact: PsContact): Promise<Contact> {

        let uri = psContact.uri.replace(/\^3B/g, ";");
        let imei= psContact.endpoint;

        let { ua_instance, ua_software, connectionId } = parseWrapped(psContact.user_agent);

        return {
            "id": psContact.id,
            uri, 
            "path": psContact.path.replace(/\^3B/g, ";"),
            connectionId,
            "uaEndpoint": {
                "ua": {
                    "instance": ua_instance,
                    "software": ua_software,
                    "pushToken": readPushNotification(uri)
                },
                "endpoint": await db.semasim.getEndpoint({ 
                    "dongle": { imei }, 
                    "sim": { "iccid": await db.asterisk.getIccidOfEndpoint(imei) }
                })
            }
        };

    }

}



export interface Contact {
    readonly id: string;
    readonly uri: string;
    readonly path: string;
    readonly connectionId: number;
    readonly uaEndpoint: Contact.UaEndpoint;
}

export namespace Contact {

    export interface UaEndpointRef {
        readonly ua: UaEndpoint.UaRef;
        readonly endpoint: UaEndpoint.EndpointRef
    }

    export interface UaEndpoint extends UaEndpointRef{
        readonly ua: UaEndpoint.Ua;
        readonly endpoint: UaEndpoint.Endpoint;
    }

    export namespace UaEndpoint {

        export function areSame(
            o1: UaEndpointRef,
            o2: UaEndpointRef
        ): boolean {
            return id(o1) === id(o2);
        }

        export function id(
            o: UaEndpointRef
        ): string {
            return JSON.stringify([
                Endpoint.id(o.endpoint),
                o.ua.instance,
            ]);
        }

        export interface UaRef {
            readonly instance: string;
        }

        export interface Ua extends UaRef {
            readonly software: string;
            readonly pushToken?: Ua.PushToken;
        }

        export namespace Ua {

            export interface PushToken {
                readonly type: string;
                readonly token: string;
            }

            export namespace PushToken {

                export function stringify(pushToken: PushToken | undefined): string | null {

                    if (pushToken === undefined) {
                        return null;
                    } else {
                        return JSON.stringify(pushToken);
                    }

                };

                export function parse(str: string | null): PushToken | undefined {

                    if (str === null) {
                        return undefined;
                    } else {
                        return JSON.parse(str);
                    }

                }

            }

        }

        export interface EndpointRef {
            readonly dongle: Endpoint.DongleRef;
            readonly sim: Endpoint.SimRef;
        }

        export interface Endpoint extends EndpointRef {
            readonly dongle: Endpoint.Dongle;
            readonly sim: Endpoint.Sim;
        }

        export namespace Endpoint {

            export function id(
                o: EndpointRef
            ): string {
                return JSON.stringify([ o.dongle.imei, o.sim.iccid ]);
            }

            export function areSame(
                o1: EndpointRef, 
                o2: EndpointRef
            ): boolean {
                return id(o1) === id(o2);
            }

            export interface DongleRef {
                readonly imei: string;
            }

            export interface Dongle extends DongleRef {
                readonly isVoiceEnabled?: boolean;
            }

            export interface SimRef {
                readonly iccid: string;
            }

            export interface Sim extends SimRef{
                readonly imsi: string;
            }


        }


    }


}


