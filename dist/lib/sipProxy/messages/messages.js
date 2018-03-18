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
//TODO: Create issue on Typescript repository.
dcMisc;
const sipLibrary = require("../../../tools/sipLibrary");
const types = require("./../../types");
const _debug = require("debug");
let debug = _debug("_sipProxy/messages");
exports.dialplanContext = "from-sip-message";
exports.evtMessage = new ts_events_extended_1.SyncEvent();
function sendMessage(contact, fromNumber, headers, text, fromNumberSimName) {
    return new Promise((resolve, reject) => {
        let actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        let uri = (() => {
            let parsedUri = sipLibrary.parsePath(contact.path)[0].uri;
            delete parsedUri.params["lr"];
            return sipLibrary.stringifyUri(parsedUri);
        })();
        fromNumber = dcMisc.toNationalNumber(fromNumber, contact.uaSim.imsi);
        chan_dongle_extended_client_1.DongleController.getInstance().ami.messageSend(`pjsip:${contact.uaSim.imsi}/${uri}`, fromNumber, actionId).catch(amiError => reject(amiError));
        sendMessage.evtOutgoingMessage.attachOnce(({ sipRequest }) => sipLibrary.getPacketContent(sipRequest).toString("utf8") === actionId, 2000, ({ sipRequest, prSipResponse }) => {
            if (fromNumberSimName) {
                sipRequest.headers.from.name = `"${fromNumberSimName} (sim)"`;
            }
            sipRequest.headers.route = sipLibrary.parsePath(contact.path);
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
(function (sendMessage) {
    sendMessage.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
})(sendMessage = exports.sendMessage || (exports.sendMessage = {}));
//From here protected
/**
 * Must be called before the first connection to backend
 * and after DongleController have been instantiated
 * */
function initDialplan() {
    return __awaiter(this, void 0, void 0, function* () {
        let ami = chan_dongle_extended_client_1.DongleController.getInstance().ami;
        let matchAllExt = "_.";
        yield ami.dialplanExtensionRemove(matchAllExt, exports.dialplanContext);
        yield ami.dialplanExtensionAdd(exports.dialplanContext, matchAllExt, 1, "Hangup");
    });
}
exports.initDialplan = initDialplan;
/**
 * Need to be call by sipRouter when a SIP MESSAGE packet is emitted by asterisk.
 *
 * @param sipRequestAsReceived Must be the sipRequest as sent by asterisk.
 * This calling this method will cause the message to be updated.
 * Even if the received packet should never be altered by the sipProxy
 * it is ok in this case as this module act as a middleware between Asterisk and
 * the semasim gateway.
 * @param prSipResponse promise that resolve if a response is received from UA or reject
 * if no response have been received in a reasonable amount of time.
 *
 */
function onOutgoingSipMessage(sipRequestAsReceived, prSipResponse) {
    sendMessage.evtOutgoingMessage.post({
        "sipRequest": sipRequestAsReceived,
        prSipResponse
    });
}
exports.onOutgoingSipMessage = onOutgoingSipMessage;
/**
 *
 * Must be called by sipProxy router when we received from backend a SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain
 *
 * @param fromContact the contact the message come from
 * @param sipRequestReceived the sipRequest as received from the backend,
 * the message will not be modified.
 *
 */
function onIncomingSipMessage(fromContact, sipRequestReceived) {
    let content = sipLibrary.getPacketContent(sipRequestReceived);
    let text = content.toString("utf8");
    if (!content.equals(Buffer.from(text, "utf8"))) {
        debug("Sip message content was not a valid UTF-8 string");
    }
    let toNumber = sipLibrary.parseUri(sipRequestReceived.headers.to.uri).user;
    let exactSendDate;
    try {
        exactSendDate = types.misc.extractBundledDataFromHeaders(sipRequestReceived.headers).exactSendDate;
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
}
exports.onIncomingSipMessage = onIncomingSipMessage;
