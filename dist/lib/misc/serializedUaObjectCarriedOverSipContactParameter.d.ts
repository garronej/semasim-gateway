import * as types from "../types";
/**
 * Returns "ua=eyJ1c2VyRW1haWwiOiJqb3...cWw__"
 * Need to be called when creating a new jsSip UA instance.
 *
 *this.jsSipUa = new JsSIP.UA({
 *    ...
 *    "contact_uri": "12..2332@semasim.com" + ";" + buildUaParameter({...})
 *    ...
 *});
 */
export declare function buildParameter(ua: types.Ua): string;
/**
 * contactUirParams=sipLibrary.parseUri(sipLibrary.getContact(sipRequestRegister)!.uri).params
 */
export declare function parseFromContactUriParams(contactUirParams: Record<string, string | null>): types.Ua;
