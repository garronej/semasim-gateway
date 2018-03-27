import * as types from "../types";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";

//TODO: rename sanityCheck.
export namespace sanityChecks {

    export function contact(o: types.Contact): boolean {

        return (
            o instanceof Object &&
            typeof o.uri === "string" &&
            typeof o.path === "string" &&
            typeof o.connectionId === "string" &&
            uaSim(o.uaSim)
        );

    }

    export function uaSim(o: types.UaSim): boolean {

        return (
            o instanceof Object &&
            ua(o.ua) &&
            dcSanityChecks.imsi(o.imsi)
        );

    }

    export function ua(o: types.Ua): boolean {

        return (
            o instanceof Object &&
            typeof o.instance === "string" &&
            isValidEmail(o.userEmail, "MUST BE LOWER CASE") &&
            platform(o.platform) &&
            typeof o.pushToken === "string" &&
            typeof o.software === "string"
        );

    }

    export function platform(o: types.Ua.Platform): boolean {

        return (
            typeof o === "string" && (
                o === "android" ||
                o === "iOS" ||
                o === "web"
            )
        );

    }

}

export function generateUaId(o: types.Ua): string {
    return JSON.stringify([o.instance, o.userEmail]);
}

export function generateUaSimId(o: types.UaSim): string {
    return JSON.stringify([o.imsi, generateUaId(o.ua)]);
}

export function areSameUaSims(
    o1: types.UaSim,
    o2: types.UaSim
): boolean {
    return generateUaSimId(o1) === generateUaSimId(o2);
}

export function isValidEmail(
    email: string,
    mustBeLc: "MUST BE LOWER CASE" | undefined = undefined
): boolean {

    const regExpEmail =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const regExpLcEmail =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;

    return (
        typeof email === "string" &&
        email.match(mustBeLc ? regExpLcEmail : regExpEmail) !== null
    );

}
