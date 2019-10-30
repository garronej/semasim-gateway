"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateUaId(o) {
    return JSON.stringify([o.instance, o.userEmail]);
}
exports.generateUaId = generateUaId;
function areSameUas(o1, o2) {
    return generateUaId(o1) === generateUaId(o2);
}
exports.areSameUas = areSameUas;
function generateUaSimId(o) {
    return JSON.stringify([o.imsi, generateUaId(o.ua)]);
}
exports.generateUaSimId = generateUaSimId;
function areSameUaSims(o1, o2) {
    return generateUaSimId(o1) === generateUaSimId(o2);
}
exports.areSameUaSims = areSameUaSims;
