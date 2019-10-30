
import * as types from "../types";
import { urlSafeB64 } from "./urlSafeBase64encoderDecoder";

const key = "ua";

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
export function buildParameter(ua: types.Ua) {
    return `${key}=${urlSafeB64.enc(JSON.stringify(ua))}`;
}

/**
 * contactUirParams=sipLibrary.parseUri(sipLibrary.getContact(sipRequestRegister)!.uri).params
 */
export function parseFromContactUriParams(contactUirParams: Record<string, string | null>): types.Ua {

    return JSON.parse(
        urlSafeB64.dec(
            contactUirParams[key]!
        )
    );

}

