import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace getDongles {
    const methodName = "getDongles";
    type Params = undefined;
    type Response = dcTypes.Dongle[];
}
export declare namespace getUsableDongleHoldingSim {
    const methodName = "getUsableDongleHoldingSim";
    type Params = {
        imsi: string;
    };
    type Response = dcTypes.Dongle.Usable | undefined;
}
export declare namespace whoHasLockedDongle {
    const methodName = "whoHasLockedDongle";
    type Params = {
        imei: string;
    };
    type Response = "I" | undefined;
}
export declare namespace getSipPasswordAndDongle {
    const methodName = "getSipPasswordAndDongle";
    type Params = {
        imsi: string;
    };
    type Response = ({
        dongle: dcTypes.Dongle.Usable;
        sipPassword: string;
    }) | undefined;
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
