import * as types from "../types";
export declare namespace sanityChecks {
    function contact(o: types.Contact): boolean;
    function uaSim(o: types.UaSim): boolean;
    function ua(o: types.Ua): boolean;
    function platform(o: types.Ua.Platform): boolean;
}
export declare function generateUaId(o: types.Ua): string;
export declare function generateUaSimId(o: types.UaSim): string;
export declare function areSameUaSims(o1: types.UaSim, o2: types.UaSim): boolean;
export declare function isValidEmail(email: string, mustBeLc?: "MUST BE LOWER CASE" | undefined): boolean;
