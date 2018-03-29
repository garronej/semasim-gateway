import * as apiDeclaration from "../../sipApiDeclarations/semasimBackend/gatewaySide/gatewaySockets";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as types from "../../types";
export declare function notifySimOnline(dongle: dcTypes.Dongle.Usable): void;
export declare function notifySimOffline(imsi: string): void;
export declare function notifyNewOrUpdatedUa(ua: types.Ua): Promise<void>;
/**
 *
 * To use when we want to send a message or make a call
 * backend will try to reach the contact with a qualify
 * if the contact does not respond a push notification
 * will be sent.
 *
 * TODO: add contextual infos about the call or the message
 * in the notification so web notification can be displayed.
 *
 */
export declare function wakeUpContact(contact: types.Contact): Promise<apiDeclaration.wakeUpContact.Response>;
/**
 *
 * To use when the contact has expired to make it re register
 * with a new connection.
 * No push notification will be sent to this ua until it re-register.
 *
 * The contact has to expire or we will keep sending push notifications
 * for ever to UA that can be no longer active ( e.g uninstalled app )
 *
 * NOTE: Web UA should never expire as it may only have one ua
 * by sim so we do not keep sending push notification
 *
 * NOTE: this push notification should not have any content
 *
 */
export declare function forceContactToRegister(contact: types.Contact): Promise<boolean>;
