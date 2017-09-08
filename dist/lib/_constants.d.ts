export declare class c {
    static readonly shared: {
        new (): {};
        readonly backendSipProxyListeningPortForGateways: 50610;
        readonly flowTokenKey: "flowtoken";
        readonly backendHostname: "semasim.com";
        readonly reg_expires: 21601;
        readonly regExpImei: RegExp;
        readonly regExpFourDigits: RegExp;
    };
    static readonly dbParamsGateway: {
        "host": string;
        "user": string;
        "password": string;
        "database": string;
    };
    static readonly gain: string;
    static readonly jitterBuffer: {
        type: string;
        params: string;
    };
    static readonly dongleCallContext: string;
    static readonly phoneNumber: string;
    static readonly sipCallContext: string;
    static readonly sipMessageContext: string;
    static readonly strMissedCall: string;
}
