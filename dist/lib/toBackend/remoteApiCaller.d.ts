import * as apiDeclaration from "../../sip_api_declarations/backendToGateway";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types from "../types";
export declare const notifySimOnline: (dongle: dcTypes.Dongle.Usable) => Promise<void>;
export declare const notifyLockedDongle: (dongle: dcTypes.Dongle.Locked) => Promise<void>;
export declare const notifyDongleOffline: (dongle: dcTypes.Dongle) => Promise<void>;
export declare const notifyNewOrUpdatedUa: (ua: types.Ua) => Promise<void>;
export declare const wakeUpContact: (contact: types.Contact) => Promise<apiDeclaration.wakeUpContact.Response>;
export declare const forceContactToRegister: (contact: types.Contact) => Promise<boolean>;
