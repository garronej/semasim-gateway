import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace getDongles {
    const methodName = "getDongles";
    type Params = undefined;
    type Response = dcTypes.Dongle[];
}
export declare namespace unlockDongle {
    const methodName = "unlockDongle";
    type Params = {
        imei: string;
        pin: string;
    };
    type Response = dcTypes.UnlockResult | undefined;
}
export declare namespace reNotifySimOnline {
    const methodName = "reNotifySimOnline";
    type Params = {
        imsi: string;
    };
    type Response = undefined;
}
