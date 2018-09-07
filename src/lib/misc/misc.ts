import * as types from "../types";

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