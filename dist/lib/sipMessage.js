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
const dcMisc = require("chan-dongle-extended-client/dist/lib/misc");
const sipProxy_1 = require("./sipProxy");
const sipLibrary = require("../tools/sipLibrary");
const types = require("./types");
const _debug = require("debug");
let debug = _debug("_sipMessage");
exports.evtMessage = new ts_events_extended_1.SyncEvent();
exports.sipMessageContext = "from-sip-message";
function startHandling() {
    return __awaiter(this, void 0, void 0, function* () {
        let ami = chan_dongle_extended_client_1.DongleController.getInstance().ami;
        let matchAllExt = "_.";
        yield ami.dialplanExtensionRemove(matchAllExt, exports.sipMessageContext);
        yield ami.dialplanExtensionAdd(exports.sipMessageContext, matchAllExt, 1, "Hangup");
        sipProxy_1.evtIncomingMessage.attach(({ fromContact, sipRequest }) => {
            let content = sipLibrary.getPacketContent(sipRequest);
            let text = content.toString("utf8");
            if (!content.equals(Buffer.from(text, "utf8"))) {
                debug("Sip message content was not a valid UTF-8 string");
            }
            let toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user;
            let exactSendDate;
            try {
                exactSendDate = types.misc.extractBundledDataFromHeaders(sipRequest.headers).exactSendDate;
            }
            catch (_a) {
                exactSendDate = undefined;
            }
            exports.evtMessage.post({
                fromContact,
                toNumber,
                text,
                exactSendDate
            });
        });
    });
}
exports.startHandling = startHandling;
function sendMessage(contact, fromNumber, headers, text, fromNumberSimName) {
    return new Promise((resolve, reject) => {
        let actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        console.log("avant : ", contact.path);
        try {
            console.log(sipLibrary.parsePath(contact.path));
        }
        catch (_a) {
            console.log("path could not be parsed");
        }
        //TODO: Use parse path!
        let uri = contact.path.split(",")[0].match(/^<(.*)>$/)[1].replace(/;lr/, "");
        console.log("uri : ", uri);
        fromNumber = dcMisc.toNationalNumber(fromNumber, contact.uaSim.imsi);
        chan_dongle_extended_client_1.DongleController.getInstance().ami.messageSend(`pjsip:${contact.uaSim.imsi}/${uri}`, fromNumber, actionId).catch(amiError => reject(amiError));
        sipProxy_1.evtOutgoingMessage.attachOnce(({ sipRequest }) => sipRequest.content === actionId, 2000, ({ sipRequest, prSipResponse }) => {
            if (fromNumberSimName) {
                sipRequest.headers.from.name = `"${fromNumberSimName} (sim)"`;
            }
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.headers = Object.assign({}, sipRequest.headers, headers);
            sipLibrary.setPacketContent(sipRequest, text);
            prSipResponse
                .then(() => resolve())
                .catch(() => reject(new Error("Not received")));
        }).catch(() => reject(new Error("Not intercepted")));
    });
}
exports.sendMessage = sendMessage;
