
//TODO: move in semasim-gateway


import { types as dcTypes } from "chan-dongle-extended-client";

export namespace getDongle {

    export const methodName = "getDongle";

    export type Params= { imei: string; };

    export type Response=dcTypes.Dongle | undefined;

}

export namespace getDongleAndSipPassword {

    export const methodName= "getUsableDongleAndSipPassword";

    export type Params= { imsi: string; };

    export type Response= {
        dongle: dcTypes.Dongle.Usable;
        sipPassword: string;
    } | undefined;

}

export namespace unlockSim {

    export const methodName = "unlockSim";

    export type Params= {
        imei: string;
        pin: string;
    };

    export type Response = dcTypes.UnlockResult | undefined;

}

//TODO: Reboot dongle should be by IMEI
export namespace rebootDongle {

    export const methodName = "rebootDongle";

    export type Params = { imsi: string; };

    export type Response = { isSuccess: boolean; };

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

export namespace deleteContact {

    export const methodName= "deleteContact";

    export type Params = { imsi: string; mem_index: number; };

    export type Response = { new_storage_digest: string; } | undefined;

}



