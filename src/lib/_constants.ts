import * as dns from "dns";

let dnsSrc_sips_tcp: { name: string; port: number } | undefined = undefined;

export class c {

    public static readonly shared= class shared {

        public static readonly gatewayPort = 80;

        public static readonly domain = "semasim.com";

    }

    public static readonly serviceName = "semasim-gateway";

    public static readonly dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "semasim",
        "password": "semasim"
    };

    public static readonly gain = `${4000}`;

    public static readonly jitterBuffer = {
        //type: "fixed",
        //params: "2500,10000"
        //type: "fixed",
        //params: "default"
        type: "adaptive",
        params: "default"
    };

    public static readonly sipCallContext = "from-sip-call";

    public static readonly sipMessageContext = "from-sip-message";

    public static readonly strMissedCall = "Missed call";

}
