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
const ts_ami_1 = require("ts-ami");
const sipLibrary = require("ts-sip");
const misc = require("./misc");
const logger = require("logger");
const debug = logger.debugFactory();
exports.dialplanContext = "from-sip-message";
exports.evtMessage = new ts_events_extended_1.SyncEvent();
function sendMessage(contact, fromNumber, headers, text, fromNumberSimName) {
    return new Promise((resolve, reject) => {
        let actionId = ts_ami_1.Ami.generateUniqueActionId();
        let uri = (() => {
            let parsedUri = sipLibrary.parsePath(contact.path)[0].uri;
            delete parsedUri.params["lr"];
            return sipLibrary.stringifyUri(parsedUri);
        })();
        ts_ami_1.Ami.getInstance().messageSend(`pjsip:${contact.uaSim.imsi}/${uri}`, fromNumber, actionId).catch(amiError => reject(amiError));
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
//From here functions are not exported outside sipProxy
/**
 * Must be called before the first connection to backend
 * and after Ami have been instantiated.
 * */
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const ami = ts_ami_1.Ami.getInstance();
        const matchAllExt = "_.";
        yield ami.dialplanExtensionRemove(matchAllExt, exports.dialplanContext);
        yield ami.dialplanExtensionAdd(exports.dialplanContext, matchAllExt, 1, "Hangup");
    });
}
exports.init = init;
/**
 * Should be called against every new asterisk socket
 * as soon as it is created.
 * prContact should resolve to the sipContact
 * associated to the socket.
 *  */
function handleAsteriskSocket(asteriskSocket, prContact) {
    asteriskSocket.evtRequest.attachPrepend(sipLibrary.isPlainMessageRequest, sipRequestAsReceived => onOutgoingSipMessage(sipRequestAsReceived, asteriskSocket.evtPacketPreWrite.waitFor(sipPacketNextHop => (!sipLibrary.matchRequest(sipPacketNextHop) &&
        sipLibrary.isResponse(sipRequestAsReceived, sipPacketNextHop)), 5000)));
    asteriskSocket.evtPacketPreWrite.attach((sipPacketNextHop) => (sipLibrary.matchRequest(sipPacketNextHop) &&
        sipLibrary.isPlainMessageRequest(sipPacketNextHop, "WITH AUTH")), sipRequestNextHop => asteriskSocket.evtResponse.attachOnce(sipResponse => sipLibrary.isResponse(sipRequestNextHop, sipResponse), ({ status }) => __awaiter(this, void 0, void 0, function* () {
        if (status !== 202) {
            return;
        }
        onIncomingSipMessage(yield prContact, sipRequestNextHop);
    })));
}
exports.handleAsteriskSocket = handleAsteriskSocket;
/**
 * Need to be called when a SIP MESSAGE packet is emitted by asterisk.
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
/**
 *
 * Must be called when we received from backend a SIP MESSAGE.
 * The sip message must have been accepted by asterisk and the content type
 * must be text/plain.
 *
 * @param fromContact the contact the message come from
 * @param sipRequest the MESSAGE sipRequest
 * the message will not be modified.
 *
 */
function onIncomingSipMessage(fromContact, sipRequest) {
    const content = sipLibrary.getPacketContent(sipRequest);
    const text = content.toString("utf8");
    if (!content.equals(Buffer.from(text, "utf8"))) {
        debug("Sip message content was not a valid UTF-8 string");
    }
    const toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user;
    let exactSendDate;
    //TODO: For now we catch the errors as all the client apps does not 
    //bundle the exact send date but eventually we should let it throw
    //( user authentication is done before )
    try {
        exactSendDate = misc.extractBundledDataFromHeaders(sipRequest.headers).exactSendDate;
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
