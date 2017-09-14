export declare class c {
    static readonly shared: {
        new (): {};
        readonly gatewayPort: 80;
        readonly flowTokenKey: "flowtoken";
        readonly domain: "semasim.com";
        readonly reg_expires: 21601;
        readonly regExpImei: RegExp;
        readonly regExpFourDigits: RegExp;
        readonly dnsSrv_sips_tcp: Promise<{
            name: string;
            port: number;
        }>;
    };
    static readonly serviceName: string;
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
    static readonly phoneNumber: string;
    static readonly sipCallContext: string;
    static readonly sipMessageContext: string;
    static readonly strMissedCall: string;
}
