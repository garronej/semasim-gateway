
const regExpEmail =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const regExpLcEmail =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;

export class c {

    public static readonly shared= class shared {

        public static readonly gatewayPort = 80;

        public static readonly domain = "semasim.com";

        public static isValidEmail(
            email: string,
            mustBeLc: "MUST BE LOWER CASE" | undefined= undefined
        ): boolean {

            return (
                typeof email === "string" && 
                email.match(mustBeLc?regExpLcEmail:regExpEmail) !== null
            );

        }

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
        "type": "adaptive",
        "params": "default"
    };

    public static readonly sipCallContext = "from-sip-call";

    public static readonly sipMessageContext = "from-sip-message";

}
