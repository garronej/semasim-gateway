"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sipLibrary = require("../tools/sipLibrary");
const testing_1 = require("transfer-tools/dist/lib/testing");
const misc_1 = require("../lib/sipProxy/misc");
let asteriskSocket = {
    "protocol": "TCP",
    "localPort": 1111,
    "localAddress": "__gateway__"
};
let backendSocket = {
    "protocol": "TLS",
    "localPort": 2222,
    "localAddress": "__gateway__"
};
let gatewaySocket = {
    "protocol": "TLS",
    "localPort": 80,
    "localAddress": "__backend_2__"
};
let clientSocket = {
    "protocol": "WSS",
    "localPort": 443,
    "localAddress": "__backend_1__",
    "remoteAddress": "__client__",
    "remotePort": 3333
};
let date_now = 1519292655023;
let imsi = "208150113995832";
let connectionId = misc_1.cid.generate(clientSocket, date_now);
testing_1.assertSame(misc_1.cid.parse(connectionId), {
    "timestamp": date_now,
    "clientSocketRemoteAddress": clientSocket.remoteAddress,
    "clientSocketRemotePort": clientSocket.remotePort
});
function asteriskInitRequest() {
    let sipRequest_A = sipLibrary.parse([
        `INVITE sip:${imsi}@semasim.com;connection_id=${connectionId} SIP/2.0`,
        `Via: SIP/2.0/TCP ${asteriskSocket.localAddress}:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias`,
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        `To:  <sip:208150113995832@semasim.com;connection_id=${connectionId}>`,
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 70",
        "Content-Length: 0",
        "Route:  " + [
            `<sip:${asteriskSocket.localAddress}:${asteriskSocket.localPort};transport=${asteriskSocket.protocol};lr>`,
            `<sip:${gatewaySocket.localAddress}:${gatewaySocket.localPort};transport=${gatewaySocket.protocol};lr>`
        ].join(",  "),
        "\r\n",
    ].join("\r\n"));
    console.log("sipRequest_A:");
    console.log(sipLibrary.stringify(sipRequest_A));
    testing_1.assertSame(misc_1.readImsi(sipRequest_A), imsi);
    let sipRequest_B = sipLibrary.buildNextHopPacket(backendSocket, sipRequest_A);
    misc_1.cid.set(sipRequest_B, connectionId);
    console.log("sipRequest_B:");
    console.log(sipLibrary.stringify(sipRequest_B));
    testing_1.assertSame(sipRequest_B, sipLibrary.parse([
        "INVITE sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_ SIP/2.0",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_",
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 69",
        "Content-Length: 0",
        "Route:  <sip:__backend_2__:80;transport=TLS;lr>",
        "Record-Route:  <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n")));
    testing_1.assertSame(misc_1.cid.read(sipRequest_B), connectionId);
    let sipRequest_C = sipLibrary.buildNextHopPacket(clientSocket, sipRequest_B);
    console.log("sipRequest_C:");
    console.log(sipLibrary.stringify(sipRequest_C));
    testing_1.assertSame(sipRequest_C, sipLibrary.parse([
        "INVITE sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_ SIP/2.0",
        "Via: SIP/2.0/WSS __backend_1__:443;branch=z9hG4bK-z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_",
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 68",
        "Content-Length: 0",
        "Record-Route:  <sip:__backend_1__:443;transport=WSS;lr>,  <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n")));
    let sipResponse_d = sipLibrary.parse([
        "SIP/2.0 180 Ringing",
        "\r\n"
    ].join("\r\n"));
    sipResponse_d.headers = sipLibrary.clonePacket(sipRequest_C).headers;
    sipResponse_d.headers.to.params["tag"] = "8117gmpdpl";
    sipResponse_d.headers.contact[0].uri = `sip:${imsi}@semasim.com`;
    delete sipResponse_d.headers["max-forwards"];
    console.log("sipResponse_d:");
    console.log(sipLibrary.stringify(sipResponse_d));
    testing_1.assertSame(misc_1.readImsi(sipResponse_d), imsi);
    let sipResponse_e = sipLibrary.buildNextHopPacket(gatewaySocket, sipResponse_d);
    console.log("sipResponse_e:");
    console.log(sipLibrary.stringify(sipResponse_e));
    testing_1.assertSame(sipResponse_e, sipLibrary.parse([
        "SIP/2.0 180 Ringing",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_;tag=8117gmpdpl",
        "Contact:  <sip:208150113995832@semasim.com>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Content-Length: 0",
        "Record-Route:  <sip:__backend_2__:80;transport=TLS;lr>,  <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n")));
    testing_1.assertSame([misc_1.readImsi, misc_1.cid.read].map(f => f(sipResponse_e)), [imsi, connectionId]);
    let sipResponse_f = sipLibrary.buildNextHopPacket(asteriskSocket, sipResponse_e);
    console.log("sipResponse_f:");
    console.log(sipLibrary.stringify(sipResponse_f));
    testing_1.assertSame(sipResponse_f, sipLibrary.parse([
        "SIP/2.0 180 Ringing",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_;tag=8117gmpdpl",
        "Contact:  <sip:208150113995832@semasim.com>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Content-Length: 0",
        "Record-Route:  <sip:__backend_2__:80;transport=TLS;lr>,  <sip:__gateway__:1111;transport=TCP;lr>",
        "\r\n"
    ].join("\r\n")));
    console.assert(sipLibrary.isResponse(sipRequest_A, sipResponse_f));
    console.assert(sipLibrary.isResponse(sipRequest_B, sipResponse_e));
    console.assert(sipLibrary.isResponse(sipRequest_C, sipResponse_d));
    console.log("PASS " + asteriskInitRequest.name);
}
function clientInitRequest() {
    console.log("TODO " + clientInitRequest.name);
}
function clientInitRequestRegister() {
    console.log("TODO " + clientInitRequestRegister.name);
}
asteriskInitRequest();
clientInitRequest();
clientInitRequestRegister();
console.log("PASS SIP LIBRARY !");
