import { DongleController as Dc } from "chan-dongle-extended-client";

import { c } from "./_constants";

export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}

export namespace PsContact {

    export type Misc = {
        ua_instance: string;
        ua_userEmail: string;
        ua_platform: Contact.UaSim.Ua.Platform;
        ua_pushToken: string;
        ua_software: string;
        connectionId: number;
    }

    export function stringifyMisc(misc: Misc): string {
        let user_agent = (new Buffer(JSON.stringify(misc), "utf8")).toString("base64");
        return user_agent;
    }

    export function parseMisc(user_agent: string): Misc {
        return JSON.parse((new Buffer(user_agent, "base64")).toString("utf8"));
    }

    export function buildContact(psContact: PsContact): Contact {

        let imsi = psContact.endpoint;

        let {
            ua_instance, 
            ua_userEmail, 
            ua_platform, 
            ua_pushToken, 
            ua_software, 
            connectionId 
        } = parseMisc(psContact.user_agent);

        return {
            "id": psContact.id,
            "uri": psContact.uri.replace(/\^3B/g, ";"),
            "path": psContact.path.replace(/\^3B/g, ";"),
            connectionId,
            "uaSim": {
                "ua": {
                    "instance": ua_instance,
                    "userEmail": ua_userEmail,
                    "platform": ua_platform,
                    "pushToken": ua_pushToken,
                    "software": ua_software
                },
                imsi
            }
        };

    }

}

export interface Contact {
    readonly id: string;
    readonly uri: string;
    readonly path: string;
    readonly connectionId: number;
    readonly uaSim: Contact.UaSim;
}

export namespace Contact {

    export function sanityCheck(o: Contact): boolean{

        return (
            o instanceof Object &&
            typeof o.id === "string" &&
            typeof o.uri === "string" &&
            typeof o.path === "string" &&
            typeof o.connectionId === "number" &&
            UaSim.sanityCheck(o.uaSim)
        );
        
    }

    export interface UaSim {
        readonly ua: UaSim.Ua;
        readonly imsi: string;
    }

    export namespace UaSim {

        export function sanityCheck(o: UaSim): boolean {

            return (
                o instanceof Object &&
                Ua.sanityCheck(o.ua) &&
                Dc.isImsiWellFormed(o.imsi)
            );

        }

        export function areSame(
            o1: UaSim,
            o2: UaSim
        ): boolean {
            return id(o1) === id(o2);
        }

        export function id( o: UaSim): string {
            return JSON.stringify([ o.imsi, Ua.id(o.ua) ]);
        }

        export interface Ua {
            readonly instance: string;
            readonly userEmail: string;
            readonly platform: Ua.Platform;
            readonly pushToken: string;
            readonly software: string;
        }

        export namespace Ua {

            export function sanityCheck(o: Ua): boolean {

                return (
                    o instanceof Object &&
                    typeof o.instance === "string" &&
                    c.shared.isValidEmail(o.userEmail, "MUST BE LOWER CASE") &&
                    platform.sanityCheck(o.platform) &&
                    typeof o.pushToken === "string" &&
                    typeof o.software === "string"
                );

            }

            export type Platform = "android" | "iOS" | "other";

            export namespace platform {

                export function sanityCheck(o: Platform): boolean{

                    return (
                        typeof o === "string" && (
                            o === "android" ||
                            o === "iOS" ||
                            o === "other"
                        )
                    );

                }

            }

            export function id(o: Ua): string {
                return JSON.stringify([o.instance, o.userEmail]);
            }

        }
    }

}
