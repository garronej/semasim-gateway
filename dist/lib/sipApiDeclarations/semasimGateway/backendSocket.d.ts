import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace getDongles {
    const methodName = "getDongles";
    type Params = undefined;
    type Response = dcTypes.Dongle[];
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
export declare namespace createContact {
    const methodName = "createContact";
    type Params = {
        imsi: string;
        name: string;
        number: string;
    };
    type Response = {
        mem_index: number;
        name_as_stored: string;
        new_storage_digest: string;
    } | undefined;
}
export declare namespace updateContactName {
    const methodName = "updateContactName";
    type Params = {
        imsi: string;
        mem_index: number;
        newName: string;
    };
    type Response = {
        new_name_as_stored: string;
        new_storage_digest: string;
    } | undefined;
}
