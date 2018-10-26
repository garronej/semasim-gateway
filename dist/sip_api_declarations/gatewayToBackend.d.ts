import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace getDongle {
    const methodName = "getDongle";
    type Params = {
        imei: string;
    };
    type Response = dcTypes.Dongle | undefined;
}
export declare namespace getDongleAndSipPassword {
    const methodName = "getUsableDongleAndSipPassword";
    type Params = {
        imsi: string;
    };
    type Response = {
        dongle: dcTypes.Dongle.Usable;
        sipPassword: string;
    } | undefined;
}
export declare namespace unlockSim {
    const methodName = "unlockSim";
    type Params = {
        imei: string;
        pin: string;
    };
    type Response = dcTypes.UnlockResult | undefined;
}
export declare namespace rebootDongle {
    const methodName = "rebootDongle";
    type Params = {
        imsi: string;
    };
    type Response = {
        isSuccess: boolean;
    };
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
export declare namespace deleteContact {
    const methodName = "deleteContact";
    type Params = {
        imsi: string;
        mem_index: number;
    };
    type Response = {
        new_storage_digest: string;
    } | undefined;
}
