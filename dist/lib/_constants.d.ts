export declare class c {
    static readonly shared: {
        new (): {};
        readonly gatewayPort: 80;
        readonly domain: "semasim.com";
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
