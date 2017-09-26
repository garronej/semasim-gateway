import * as dns from "dns";

let dnsSrc_sips_tcp: { name: string; port: number } | undefined = undefined;

export class c {

    public static readonly shared= class shared {

        public static readonly gatewayPort = 80;

        public static readonly flowTokenKey = "flowtoken";

        public static readonly domain = "semasim.com";

        public static readonly regExpImei = /^[0-9]{15}$/;

        public static readonly regExpFourDigits = /^[0-9]{4}$/;

        public static get dnsSrv_sips_tcp(){

            if (dnsSrc_sips_tcp) return Promise.resolve(dnsSrc_sips_tcp);

            let ofType = dnsSrc_sips_tcp!;

            return new Promise<typeof ofType>((resolve, reject) => {

                dns.resolveSrv(
                    `_sips._tcp.${c.shared.domain}`,
                    (error, addresses) => {

                        if (error || !addresses.length) {
                            return reject(error);
                        }

                        let { name, port }= addresses[0];

                        dnsSrc_sips_tcp= { name, port };

                        resolve(dnsSrc_sips_tcp);

                    }
                );

            });

        }

    }

    public static readonly serviceName = "semasim-gateway";

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

    public static readonly strMissedCall = "This correspondent tried to reach you but hanged up before the call could be forwarded.";

}
