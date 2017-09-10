export class c {

    public static readonly shared= class shared {

        public static readonly backendSipProxyListeningPortForGateways = 50610;

        public static readonly flowTokenKey = "flowtoken";

        public static readonly backendHostname = "semasim.com";

        public static readonly reg_expires = 21601;

        public static readonly regExpImei = /^[0-9]{15}$/;

        public static readonly regExpFourDigits = /^[0-9]{4}$/;

    }

    public static readonly dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "root",
        "password": "abcde12345",
        "database": "semasim"
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

    public static readonly phoneNumber = "_[+0-9].";

    public static readonly sipCallContext = "from-sip-call";

    public static readonly sipMessageContext = "from-sip-message";

    public static readonly strMissedCall= "This correspondent tried to reach you but hanged up before the call could be forwarded.";

}