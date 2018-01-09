
import { DongleController as Dc } from "chan-dongle-extended-client";

export namespace getDongles {

    export const methodName = "getDongles";

    export type Params= undefined;

    export type Response=Dc.Dongle[];

}

export namespace unlockDongle {

    export const methodName = "unlockDongle";

    export type Params= {
        imei: string;
        pin: string;
    };

    export type Response = Dc.UnlockResult | undefined;

}

export namespace reNotifySimOnline {

    export const methodName= "reNotifySimOnline";

    export type Params= { imsi: string; };

    export type Response= undefined;

}

