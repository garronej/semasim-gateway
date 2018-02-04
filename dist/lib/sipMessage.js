"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_events_extended_1 = require("ts-events-extended");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const sipProxy_1 = require("./sipProxy");
const sipLibrary = require("../tools/sipLibrary");
const _constants_1 = require("./_constants");
const _debug = require("debug");
let debug = _debug("_sipMessage");
exports.evtMessage = new ts_events_extended_1.SyncEvent();
function startHandling() {
    return __awaiter(this, void 0, void 0, function* () {
        let ami = chan_dongle_extended_client_1.DongleController.getInstance().ami;
        let matchAllExt = "_.";
        yield ami.dialplanExtensionRemove(matchAllExt, _constants_1.c.sipMessageContext);
        yield ami.dialplanExtensionAdd(_constants_1.c.sipMessageContext, matchAllExt, 1, "Hangup");
        sipProxy_1.evtIncomingMessage.attach(({ fromContact, sipRequest }) => {
            let { isValidInput, text } = utf8EncodedDataAsBinaryStringToString(sipRequest.content);
            if (!isValidInput)
                debug("Sip message content was not a valid UTF-8 string");
            let toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user;
            exports.evtMessage.post({ fromContact, toNumber, text });
        });
    });
}
exports.startHandling = startHandling;
function sendMessage(contact, from_number, headers, text, from_number_sim_name) {
    return new Promise((resolve, reject) => {
        let actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        let uri = contact.path.split(",")[0].match(/^<(.*)>$/)[1].replace(/;lr/, "");
        from_number = chan_dongle_extended_client_1.utils.toNationalNumber(from_number, contact.uaSim.imsi);
        chan_dongle_extended_client_1.DongleController.getInstance().ami.messageSend(`pjsip:${contact.uaSim.imsi}/${uri}`, from_number, actionId).catch(amiError => reject(amiError));
        sipProxy_1.evtOutgoingMessage.attachOnce(({ sipRequest }) => sipRequest.content === actionId, 2000, ({ sipRequest, prSipResponse }) => {
            if (from_number_sim_name)
                sipRequest.headers.from.name = `"${from_number_sim_name} (sim)"`;
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.content = stringToUtf8EncodedDataAsBinaryString(text);
            sipRequest.headers = Object.assign({}, sipRequest.headers, headers);
            prSipResponse
                .then(() => resolve())
                .catch(() => reject(new Error("Not received")));
        }).catch(() => reject(new Error("Not intercepted")));
    });
}
exports.sendMessage = sendMessage;
function utf8EncodedDataAsBinaryStringToString(utf8EncodedDataAsBinaryString) {
    let uft8EncodedData = new Buffer(utf8EncodedDataAsBinaryString, "binary");
    let text = uft8EncodedData.toString("utf8");
    let isValidInput = uft8EncodedData.equals(new Buffer(text, "utf8"));
    return { isValidInput, text };
}
function stringToUtf8EncodedDataAsBinaryString(text) {
    return (new Buffer(text, "utf8")).toString("binary");
}
