export declare class c {
    static readonly shared: {
        new (): {};
        readonly gatewayPort: 80;
        readonly domain: "semasim.com";
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
    static readonly sipCallContext: string;
    static readonly sipMessageContext: string;
    static readonly strMissedCall: string;
}
