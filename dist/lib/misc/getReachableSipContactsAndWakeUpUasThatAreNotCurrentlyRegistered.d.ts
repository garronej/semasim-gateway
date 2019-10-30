import * as types from "../types";
export declare function getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered(params: {
    imsi: string;
    asyncUaMatcher?: (ua: types.Ua) => Promise<boolean>;
    reachableSipContactCallbackFn: (reachableSipContact: types.Contact) => void;
}): void;
