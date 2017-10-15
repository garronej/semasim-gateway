export interface PsContact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace PsContact {
    function buildUserAgentFieldValue(ua_instance: string, ua_software: string): string;
    function buildContact(psContact: PsContact): Promise<Contact>;
}
export interface Contact {
    readonly ps: PsContact;
    readonly uaEndpoint: Contact.UaEndpoint;
    readonly flowToken: string;
    readonly pretty: string;
}
export declare namespace Contact {
    interface UaEndpointRef {
        readonly ua: UaEndpoint.UaRef;
        readonly endpoint: UaEndpoint.EndpointRef;
    }
    interface UaEndpoint extends UaEndpointRef {
        readonly ua: UaEndpoint.Ua;
        readonly endpoint: UaEndpoint.Endpoint;
    }
    namespace UaEndpoint {
        function areSame(o1: UaEndpointRef, o2: UaEndpointRef): boolean;
        function id(o: UaEndpointRef): string;
        interface UaRef {
            readonly instance: string;
        }
        interface Ua extends UaRef {
            readonly software: string;
            readonly pushToken?: Ua.PushToken;
        }
        namespace Ua {
            interface PushToken {
                readonly type: string;
                readonly token: string;
            }
            namespace PushToken {
                function stringify(pushToken: PushToken | undefined): string | null;
                function parse(str: string | null): PushToken | undefined;
            }
        }
        interface EndpointRef {
            readonly dongle: Endpoint.DongleRef;
            readonly sim: Endpoint.SimRef;
        }
        interface Endpoint extends EndpointRef {
            readonly dongle: Endpoint.Dongle;
            readonly sim: Endpoint.Sim;
        }
        namespace Endpoint {
            function id(o: EndpointRef): string;
            function areSame(o1: EndpointRef, o2: EndpointRef): boolean;
            interface DongleRef {
                readonly imei: string;
            }
            interface Dongle extends DongleRef {
                readonly lastConnectionDate: Date;
                readonly isVoiceEnabled?: boolean;
            }
            interface SimRef {
                readonly iccid: string;
            }
            interface Sim extends SimRef {
                readonly imsi: string;
            }
        }
    }
}
