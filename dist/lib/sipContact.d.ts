export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace PsContact {
    type Misc = {
        ua_instance: string;
        ua_userEmail: string;
        ua_platform: Contact.UaSim.Ua.Platform;
        ua_pushToken: string;
        ua_software: string;
        connectionId: number;
    };
    function stringifyMisc(misc: Misc): string;
    function parseMisc(user_agent: string): Misc;
    function buildContact(psContact: PsContact): Contact;
}
export interface Contact {
    readonly id: string;
    readonly uri: string;
    readonly path: string;
    readonly connectionId: number;
    readonly uaSim: Contact.UaSim;
}
export declare namespace Contact {
    function sanityCheck(o: Contact): boolean;
    interface UaSim {
        readonly ua: UaSim.Ua;
        readonly imsi: string;
    }
    namespace UaSim {
        function sanityCheck(o: UaSim): boolean;
        function areSame(o1: UaSim, o2: UaSim): boolean;
        function id(o: UaSim): string;
        interface Ua {
            readonly instance: string;
            readonly userEmail: string;
            readonly platform: Ua.Platform;
            readonly pushToken: string;
            readonly software: string;
        }
        namespace Ua {
            function sanityCheck(o: Ua): boolean;
            type Platform = "android" | "iOS" | "other";
            namespace platform {
                function sanityCheck(o: Platform): boolean;
            }
            function id(o: Ua): string;
        }
    }
}
