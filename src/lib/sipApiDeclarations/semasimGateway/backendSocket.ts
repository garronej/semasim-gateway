
import { types as dcTypes } from "chan-dongle-extended-client";

export namespace getDongles {

    export const methodName = "getDongles";

    export type Params= undefined;

    export type Response=dcTypes.Dongle[];

}

export namespace getUsableDongleHoldingSim {

    export const methodName = "getUsableDongleHoldingSim";

    export type Params= { imsi: string; };

    export type Response= dcTypes.Dongle.Usable | undefined;
    
}

export namespace whoHasLockedDongle {

    export const methodName= "whoHasLockedDongle";

    export type Params= { imei: string; };

    export type Response= "I" | undefined;

}

export namespace getSipPasswordAndDongle {

    export const methodName= "getSipPasswordAndDongle";

    export type Params= { imsi: string; };

    export type Response= ({
        dongle: dcTypes.Dongle.Usable;
        sipPassword: string;
    }) | undefined;

}

export namespace unlockDongle {

    export const methodName = "unlockDongle";

    export type Params= {
        imei: string;
        pin: string;
    };

    export type Response = dcTypes.UnlockResult | undefined;

}

export namespace reNotifySimOnline {

    export const methodName= "reNotifySimOnline";

    export type Params= { imsi: string; };

    export type Response= undefined;

}

