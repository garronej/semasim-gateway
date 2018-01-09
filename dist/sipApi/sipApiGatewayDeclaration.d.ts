import { DongleController as Dc } from "chan-dongle-extended-client";
export declare namespace getDongles {
    const methodName = "getDongles";
    type Params = undefined;
    type Response = Dc.Dongle[];
}
export declare namespace unlockDongle {
    const methodName = "unlockDongle";
    type Params = {
        imei: string;
        pin: string;
    };
    type Response = Dc.UnlockResult | undefined;
}
export declare namespace reNotifySimOnline {
    const methodName = "reNotifySimOnline";
    type Params = {
        imsi: string;
    };
    type Response = undefined;
}
