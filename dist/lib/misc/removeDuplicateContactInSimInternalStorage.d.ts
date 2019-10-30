import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
/** two contact are considered duplicated when they have the same number
 * regardless of the name of the contact */
export declare function removeDuplicateContactInSimInternalStorage(dongle: dcTypes.Dongle.Usable, dc: Dc): Promise<void>;
