
import * as types from "../types";
import { urlSafeB64 } from "./urlSafeBase64encoderDecoder";

export type RegistrationParams = Pick<types.Ua, "userEmail" | "towardUserEncryptKeyStr" | "messagesEnabled">;

export namespace RegistrationParams {

    const key = "registration_params";

    /** returns registration_params=eyJ1c2VyRW1haWwiOiJqb3...cWw__ */
    export function build(registrationParams: RegistrationParams) {
        return `${key}=${urlSafeB64.enc(JSON.stringify(registrationParams))}`
    }

    export function parse(
        contactUirParams: Record<string, string | null>,
        contactAorParams: Record<string, string | null>
    ): RegistrationParams {
        return JSON.parse(
            urlSafeB64.dec(
                (contactUirParams[key] || contactAorParams[key])!
            )
        );
    }

};