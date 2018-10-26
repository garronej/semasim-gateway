import * as types from "../types";
export declare namespace sanityChecks {
    function contact(o: types.Contact): boolean;
    function uaSim(o: types.UaSim): boolean;
    function ua(o: types.Ua): boolean;
    function platform(o: types.Ua.Platform): boolean;
}
export declare function isValidEmail(email: string, mustBeLc?: "MUST BE LOWER CASE" | undefined): boolean;
