import * as core from "./core";
import * as types from "./types";

//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";

export function matchRequest(sipPacket: types.Packet): sipPacket is types.Request {
    return "method" in sipPacket;
}

/** Safely set text based content (encoded in utf8 ) */
export function setPacketContent(sipPacket: types.Packet, str: string){

    let data= Buffer.from(str, "utf8");

    sipPacket.headers["content-length"] = data.byteLength;

    sipPacket.content= data.toString("binary");

}

/** Get the RAW content as buffer */
export function getPacketContent(sipPacket: types.Packet): Buffer {

    return Buffer.from( sipPacket.content, "binary" );

}

export function readSrflxAddrInSdp(sdp: string): string | undefined {

    for (let m_i of core.parseSdp(sdp).m) {

        if (m_i.media !== "audio") continue;

        for (let a_i of m_i.a) {

            let match = a_i.match(
                /^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/
            );

            if (match) return match[1];

        }
    }

    return undefined;

}

//TODO: only on gw remove ?
export function isPlainMessageRequest(sipRequest: types.Request): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/)
    );

}


export function parsePath(path: string): types.AoRWithParsedUri[] {

    const message = core.parse([
        `DUMMY _ SIP/2.0`,
        `Path: ${path}`,
        "\r\n"
    ].join("\r\n")) as types.Request;

    return message.headers.path!;

}

export function parseOptionTags(headerFieldValue: string | undefined): string[] {

    if (!headerFieldValue) return [];

    return headerFieldValue.split(",").map(optionTag => optionTag.replace(/\s/g, ""));

}

export function hasOptionTag(
    headers: types.Headers,
    headerField: string,
    optionTag: string
): boolean {

    let headerFieldValue = headers[headerField];

    let optionTags = parseOptionTags(headerFieldValue);

    return optionTags.indexOf(optionTag) >= 0;

}

export function addOptionTag(
    headers: types.Headers,
    headerField: string,
    optionTag: string
) {

    if (hasOptionTag(headers, headerField, optionTag))
        return;

    let optionTags = parseOptionTags(headers[headerField]);

    optionTags.push(optionTag);

    headers[headerField] = optionTags.join(", ");

}




export function filterSdpCandidates(
    keep: { host: boolean; srflx: boolean; relay: boolean; },
    sdp: string
): string {

    let shouldKeepCandidate = (candidateLine: string): boolean => {

        return (
            (keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/))
        );

    };

    let parsedSdp = core.parseSdp(sdp);

    let arr = parsedSdp.m[0].a;

    for (let line of [...arr]) {

        if (!line.match(/^candidate/)) continue;

        if (!shouldKeepCandidate(line)) {
            arr.splice(arr.indexOf(line), 1);
        }

    }

    return core.stringifySdp(sdp);


}