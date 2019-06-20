import * as types from "../types";
export declare type RegistrationParams = Pick<types.Ua, "userEmail" | "towardUserEncryptKeyStr" | "messagesEnabled">;
export declare namespace RegistrationParams {
    /** returns registration_params=eyJ1c2VyRW1haWwiOiJqb3...cWw__ */
    function build(registrationParams: RegistrationParams): string;
    function parse(contactUirParams: Record<string, string | null>, contactAorParams: Record<string, string | null>): RegistrationParams;
}
