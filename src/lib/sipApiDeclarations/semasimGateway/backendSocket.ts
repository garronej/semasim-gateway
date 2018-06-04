
import { types as dcTypes } from "chan-dongle-extended-client";

export namespace getDongles {

    export const methodName = "getDongles";

    export type Params= undefined;

    export type Response=dcTypes.Dongle[];

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

export namespace createContact {

    export const methodName= "createContact";

    export type Params = { imsi: string; name: string; number: string; };

    export type Response = {
        mem_index: number;
        name_as_stored: string;
        new_storage_digest: string;
    } | undefined;

}

export namespace updateContactName {

    export const methodName= "updateContactName";

    export type Params = { imsi: string; mem_index: number; newName: string; };

    export type Response = { new_name_as_stored: string; new_storage_digest: string; } | undefined;

}

